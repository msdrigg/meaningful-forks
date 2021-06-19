import {
  getSourceRepoFullName,
  compareRepos,
  getForks,
  getMainData
} from 'apiBackend'
import { meta } from 'eslint/lib/rules/*'
import { introspectionFromSchema } from 'graphql'

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

  for (let newNode of networkNodes) {
    if (!(newNode.id in queryMap)) {
      parent.children[newNode.id] = getNewQueryNode(newNode)
    }
  }

  let metadata = parent.metadata
  if (querySortOrder === QUERY_SORT_ORDERS.STARS) {
    let newLeastStars = nodes[nodes.length - 1].starCount
    let parentLeastStars = metadata.leastStars
      ? metadata.leastStars
      : newLeastStars
    if (parentLeastStars <= newLeastStars) {
      metadata.leastStars = newLeastStars
      parent.hasMoreStars = pageInfo.hasNextPage
      parent.starredEndCursor = pageInfo.endCursor
    }
  } else if (querySortOrder === QUERY_SORT_ORDERS.RECENT) {
    let newOldestTime = nodes[nodes.length - 1].pulledAt
    let parentOldestTime = metadata.leastRecent
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
  const { cuttoffActivityDate, loadCount, depthLevel } = options

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
2.b.i For dom nodes, insert in dom using insertAfter(aboveDomNode)
2.b.ii For data nodes, insert using array.insertAt(index)
2.c Also add dom/data nodes to domMap and dataMap (do this first)

We use this complicated method so that repeated updates or and changes never have any trouble and dom updates as we get new data
*/

/*
Checkout /repos/{owner}/{repo}/stats/{something} for interesting usage, could be relevent 
Could use {participation} to see weekly commit activity
*/
