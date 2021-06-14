import {
  getSourceRepoFullName,
  compareRepos,
  getForks,
  getMainData
} from 'apiBackend'

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

We use this complicated method so that conflicting diffs never have any trouble and dom updates as we get new data
*/
