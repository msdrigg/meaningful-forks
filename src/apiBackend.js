import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { BatchHttpLink } from '@apollo/client/link/batch-http'

const RepositoryOrderField = {
  PUSHED_AT: 'PUSHED_AT',
  STARRED: 'STARGAZERS'
}
const DEFAULT_FORKS_PAGINATION = 30

// GraphQL query fragment to get the standard necessary fields on a repository
const CORE_REPO_FIELDS = gql`
  fragment RepoFields on Repository {
    id
    nameWithOwner
    isFork
    forkCount
    stargazerCount
    pushedAt
    owner {
      id
    }
    defaultBranchRef {
      id
      name
      target {
        ... on Commit {
          id
          authoredDate
        }
      }
      prefix
    }
    stargazers(orderBy: { field: STARRED_AT, direction: ASC }, first: 5) {
      nodes {
        id
      }
    }
  }
`

// Query to get all repositories and subforks 2 levels down with varying numbers of returned repositories.
const INITIAL_QUERY = gql`
  ${CORE_REPO_FIELDS}
  query Main(
    $owner: String!
    $name: String!
    $baseAmount: Int = 50
    $subforkAmount: Int = 4
  ) {
    repository(name: $name, owner: $owner) {
      ...RepoFields
      recentForks: forks(
        orderBy: { field: PUSHED_AT, direction: DESC }
        first: $baseAmount
      ) {
        nodes {
          ...RepoFields
          recentForks: forks(
            orderBy: { field: PUSHED_AT, direction: DESC }
            first: $subforkAmount
          ) {
            nodes {
              ...RepoFields
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
          starredForks: forks(
            orderBy: { field: STARGAZERS, direction: DESC }
            first: $subforkAmount
          ) {
            nodes {
              ...RepoFields
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      starredForks: forks(
        orderBy: { field: STARGAZERS, direction: DESC }
        first: $baseAmount
      ) {
        nodes {
          ...RepoFields
          recentForks: forks(
            orderBy: { field: PUSHED_AT, direction: DESC }
            first: $subforkAmount
          ) {
            nodes {
              ...RepoFields
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
          starredForks: forks(
            orderBy: { field: STARGAZERS, direction: DESC }
            first: $subforkAmount
          ) {
            nodes {
              ...RepoFields
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`

const SINGLE_REPO_QUERY = gql`
  ${CORE_REPO_FIELDS}
  query BaseForks(
    $owner: String!
    $name: String!
    $order: RepositoryOrderField!
    $amount: Int = 30
    $startCursor: String
  ) {
    repository(name: $name, owner: $owner) {
      forks(
        orderBy: { field: $order, direction: DESC }
        first: $amount
        after: $startCursor
      ) {
        nodes {
          ...RepoFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`
function getCompareUrl(sourceRepoData, compareRepoData) {
  return `https://api.github.com/repos/${sourceRepoData.nameWithOwner}/compare/${sourceRepoData.owner.login}:${sourceRepoData.defaultBranchRef.name}...${compareRepoData.owner.login}:${compareRepoData.defaultBranchRef.name}?per_page=1`
}

function getBaseUrl(owner, name) {
  return `https://api.github.com/repos/${owner}/${name}`
}

export function getSourceRepoFullName(owner, name, accessToken) {
  if (accessToken !== undefined && accessToken !== '') {
    return fetch(getBaseUrl(owner, name), {
      headers: {
        Authorization: `token ${accessToken}`
      }
    })
      .then((data) => data.json())
      .then((json) => {
        let sourceJson = json
        if (json.parent) sourceJson = json.parent
        if (json.source) sourceJson = json.source

        return {
          owner: sourceJson.owner.login,
          name: sourceJson.name
        }
      })
  } else {
    throw Error('Global token was not defined before executing compare action')
  }
}

export class QueryEngine {
  constructor(accessToken, onQueryLoaded) {
    /* Handles queries to github api
     * Args:
     *  accessToken (string): User Personal Access Token
     *  onQueryLoaded (function):
     *    Callback for queries
     *    This funciton accepts two arguments:
     *      (parentId: string, forks: List<Fork>)
     *    parentId is the id of the forks' parent repo
     *    If parentId is null, this is the root repo
     *    forks is a list of forks with the necessary metadata
     */
    this.onQueryLoaded = onQueryLoaded

    if (accessToken) {
      const batchedLink = BatchHttpLink({
        uri: 'https://api.github.com/graphql',
        cache: new InMemoryCache(),
        headers: {
          authorization: `token ${accessToken}`
        },
        batchMax: 10, // No more than 5 operations per batch
        batchInterval: 20 // Wait no more than 20ms after first batched operation
      })
      this.gqlClient = new ApolloClient({ link: batchedLink })
      this.authorized = true
      this.fetchContext = {
        headers: {
          Authorization: `token ${accessToken}`
        }
      }
    } else {
      this.authorized = false
      this.fetchContext = undefined
    }
  }

  async compareRepos(sourceRepoData, compareRepoData) {
    return fetch(
      getCompareUrl(sourceRepoData, compareRepoData),
      this.fetchContext
    )
      .then((data) => data.json())
      .then((json) => {
        return {
          aheadBy: json.ahead_by,
          behindBy: json.behind_by
        }
      })
  }

  async getForks(owner, name, amount, order) {
    const variables = {
      owner: owner,
      name: name,
      amount: amount || DEFAULT_FORKS_PAGINATION,
      order: order || RepositoryOrderField.STARRED
    }

    return this.gqlClient
      .query({
        query: SINGLE_REPO_QUERY,
        variables: variables
      })
      .then((result) => {
        console.log(result)
        return result
        // TODO: Parse into usable format
      })
      .catch((error) => {
        console.error(error)
      })
  }

  async loadInitialForks(owner, name, baseQueryAmount) {
    if (!this.authorized) {
      throw Error('Unauthorized search not yet implemented')
    }

    const variables = {
      owner: owner,
      name: name,
      baseQueryAmount: baseQueryAmount
    }

    return this.gqlClient
      .query({
        query: INITIAL_QUERY,
        variables: variables
      })
      .then((result) => {
        console.log(result)
        // Parse into usable result
        return result
      })
      .catch((error) => {
        console.error(error)
      })
  }
}
