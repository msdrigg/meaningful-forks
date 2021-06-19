import {
  getSourceRepoFullName,
  compareRepos,
  getForks,
  getMainData
} from 'apiBackend'
import { meta } from 'eslint/lib/rules/*'
import { introspectionFromSchema } from 'graphql'
import * as trees from 'trees'

const Priority = {
  Balanced: 'Balanced',
  Stars: 'Stars',
  Activity: 'Activity'
}
const DEFAULT_CUTTOFF_STARS = 0
const DEFAULT_CUTTOFF_DAYS = undefined
const DEFAULT_QUERY_SIZE = 30
const DEFAULT_CUTTOFF_DEPTH = 4
const DEFAULT_MAX_FORKS = 200
const DEFAULT_LOADING_PRIORITY = Priority.Balanced

async function prefetchSource(username, repoName, auth) {
  return getSourceRepoFullName(username, repoName, auth)
}

async function prefetchBody(userName, repoName, client) {
  return getMainData(userName, repoName, 30, 10, client)
}

async function prefetchReady(url, auth, client) {
  const match = url.match(/^(?:https:\/\/)?github\.com\/([^/]+)\/([^/]+).*$/)
  const username = match[0]
  const reponame = match[1]

  prefetchSource(username, reponame, auth).then((source) => {
    prefetchBody(source.owner, source.name, client)
  })
}

function getNewQueryNode(networkNode) {
  return (queryNode = {
    children: [],
    metadata: {
      starredEndCursor: undefined,
      pulledAtEndCursor: undefined,
      starCount: networkNode.starCount,
      pulledAt: networkNode.pulledAt,
      hasMoreStars: networkNode.forkCount > 0,
      hasMoreRecent: networkNode.forkCount > 0
    }
  })
}

const QUERY_SORT_ORDERS = {
  STARS: 'STARS',
  RECENT: 'RECENT'
}

export function addToQueryTree(
  queryTree,
  queryMap,
  networkNodes,
  querySortOrder,
  parentId
) {
  const { nodes, pageInfo } = newQuery.data.repository.forks
  let parentNode
  if (parentId === undefined) {
    // Set parent to root of queryTree
    parent = queryTree
  } else {
    parentNode = queryMap[parentId]
  }

  for (const newNode of networkNodes) {
    if (!(newNode.id in queryMap)) {
      parent.children[newNode.id] = getNewQueryNode(newNode)
    }
  }

  const metadata = parent.metadata
  if (querySortOrder === QUERY_SORT_ORDERS.STARS) {
    const newLeastStars = nodes[nodes.length - 1].starCount
    const parentLeastStars = metadata.leastStars
      ? metadata.leastStars
      : newLeastStars
    if (parentLeastStars <= newLeastStars) {
      metadata.leastStars = newLeastStars
      parent.hasMoreStars = pageInfo.hasNextPage
      parent.starredEndCursor = pageInfo.endCursor
    }
  } else if (querySortOrder === QUERY_SORT_ORDERS.RECENT) {
    const newOldestTime = nodes[nodes.length - 1].pulledAt
    const parentOldestTime = metadata.leastRecent
      ? metadata.leastRecent
      : newOldestTime
    if (parentOldestTime <= newOldestTime) {
      metadata.leastRecent = newOldestTime
      parent.hasMoreRecent = pageInfo.hasNextPage
      parent.pulledAtEndCursor = pageInfo.endCursor
    }
  }
}

export async function loadMoreNodes(
  username,
  reponame,
  options,
  client,
  dataCallback
) {
  /*
   * loadMoreNotes is responsible for queuing more nodes and
   * triggering specified actions associated with them
   *
   */

  // Not currently using config
  const {
    cuttoffStarCount = DEFAULT_CUTTOFF_STARS,
    cuttoffInactivityDays = DEFAULT_CUTTOFF_DAYS,
    cuttoffSubforkDepth = DEFAULT_CUTTOFF_DEPTH,
    querySize = DEFAULT_QUERY_SIZE
  } = options

  const baseQueryCount = Math.min(30, cuttoffTotalNumber)
  const subQueryCount = 10
  getMainData(username, reponame, baseQueryCount, subQueryCount, client).then(
    (data) => {
      /* Logic to decide where to load additional data
       * 1. Are we over the threshold for repos collected --> stop
       * 2. Is our bottom stargazer repo still have stars --> load stars
       * 3. Do we have remaining repos to load from pulled_at repos --> load pulled_at repos
       *
       * With every new data load, we call our data callback function
       * dataCallback accepts our node list with an optional parent id (undefined if parent is root)
       */
      const baseData = data.repository
      const starredForksBase = baseData.starredForks.forks
      const recentForksBase = baseData.recentForks.forks
      dataCallback(starredForksBase.nodes)
      dataCallback(recentForksBase.nodes)
      const forkQuerySet = {}

      // Our initial query also includes one subnode level
      starredForksBase.nodes.forEach((fork) => {
        forkQuerySet[fork.id] = true
        if (fork.forks.nodes.length > 0) {
          dataCallback(fork.forks.nodes)
          fork.forks.nodes.forEach((subfork) => {
            forkQuerySet[subfork.id] = true
          })
        }
      })

      recentForksBase.nodes.forEach((fork) => {
        forkQuerySet[fork.id] = true
        if (fork.forks.nodes.length > 0) {
          dataCallback(fork.forks.nodes)
          fork.forks.nodes.forEach((subfork) => {
            forkQuerySet[subfork.id] = true
          })
        }
      })
    }
  )
}

/*
Parsing data: with each new dataset,
1.a check if values are in the data or dom nodes, in which case, directly update them (if data map is identical in values, ignore)
1.b Otherwise, create them
1.b.i If node is in dom but not dataMap, remove old node before treating it as new
2.a When creating, assume previous data is sorted, and insert sorted
2.b.i For dom nodes, insert in dom using insertAfter(belowDomNode)
2.b.ii For data nodes, insert using array.insertAt(index)
2.c Also add dom/data nodes to domMap and dataMap (do this first)

We use this complicated method so that repeated updates or and changes never have any trouble and dom updates as we get new data
*/

/*
Checkout /repos/{owner}/{repo}/stats/{something} for interesting usage, could be relevent 
Could use {something=participation} to see weekly commit activity
*/

async function onForksLoaded(forks, parentId, metadata, sortOrder) {
  // Callback for query response loaded
  // Cache Maps
  const { queryMap, dataMap, domMap } = globalLoader
  const parentQueryNode = queryMap.get(parentId)
  const parentDataNode = dataMap.get(parentId)
  const parentDomNode = domMap.get(parentId)

  // Update parent metadata
  const queryMetadata = parentQueryNode.metadata[sortOrder]
  queryMetadata.endCursor = metadata.endCursor
  queryMetadata.hasMore = metadata.hasNextCursor

  forks.sortBy(sessionVariables.sortingFunction).forEach((forkEdge) => {
    const fork = forkEdge.node
    const cursor = forkEdge.cursor

    // Check that fork not duplicate
    if (queryMap.get(fork.id) === undefined) {
      // Add to query tree
      const queryNode = {
        metadata: {
          id: fork.id
        },
        children: new Map()
      }
      // All maps are indexed by id
      queryMap.set(fork.id, queryNode)
      // Query tree is indexed by cursor
      parentQueryNode.children.set(cursor, queryNode)
      const dataNode = {
        children: [],
        metadata: {
          name: fork.name,
          ownerLogin: fork.owner.login,
          starCount: fork.starCount,
          forkDepth: parentQueryNode.forkDepth + 1,
          subforkCount: fork.subforkCount
        }
      }

      // Add to data map and data tree
      dataMap.set(fork.id, dataNode)
      // Inserts and returns element index
      const insertPosition = trees.insert(dataNode, parentDataNode.children)

      // Update dom
      const existingDomNode = domMap.get(fork.id)
      let baseDomNode
      if (existingDomNode === undefined) {
        baseDomNode = createBaseDomNode(document, dataNode)
        domMap.set(fork.id, baseDomNode)
      } else {
        baseDomNode = existingDomNode
      }
      appendStarInfo(document, baseDomNode, fork.starCount)

      // Add it at the right position
      let belowDomNode = null
      if (insertPosition < parentDomNode.children.length - 1) {
        belowDomNode = domMap.get(
          parentDataNode.children[insertPosition + 1].id
        )
      }

      parentDomNode.insertBefore(baseDomNode, belowDomNode)

      // Async behavior after
      appendAheadBehind(document, fork.id)
    }
  })
}

// Unimplemented functions:
// core.sortingFunction(queryFork)
// appendStarInfo
// appendDomNode
// createBaseDomNode
// appendAheadBehind
