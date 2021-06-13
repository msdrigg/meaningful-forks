import {
  ApolloClient,
  InMemoryCache,
  gql
} from '@apollo/client'
import { BatchHttpLink } from '@apollo/client/link/batch-http'

let globalToken = ''
let globalClient = null
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
    stargazers(orderBy: {field: STARRED_AT, direction: ASC}, first: 5) {
      nodes {
        id
      }
    }
}`
// https://api.github.com/repos/angular/angular/compare/angular:master...gisdaocaoren:master?per_page=1
const MAIN_QUERY = gql`
    ${CORE_REPO_FIELDS}
    query Main($owner: String!, $name: String!) {
      repository(name: $name, owner: $owner) {
        ...RepoFields
        recentForks: forks(orderBy: {field: PUSHED_AT, direction: DESC}, first: 30) {
          nodes {
            ...RepoFields
            recentForks: forks(orderBy: {field: PUSHED_AT, direction: DESC}, first: 10) {
              nodes {
                ...RepoFields
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
            starredForks: forks(orderBy: {field: STARGAZERS, direction: DESC}, first: 10) {
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
        starredForks: forks(orderBy: {field: STARGAZERS, direction: DESC}, first: 30, after: "Y3Vyc29yOnYyOpICzga1fFg=") {
          nodes {
            ...RepoFields
            recentForks: forks(orderBy: {field: PUSHED_AT, direction: DESC}, first: 10) {
              nodes {
                ...RepoFields
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
            starredForks: forks(orderBy: {field: STARGAZERS, direction: DESC}, first: 10) {
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

const RepositoryOrderField = {
  PUSHED_AT: 'PUSHED_AT',
  STARRED: 'STARGAZERS'
}

const BASE_REPO_QUERY = gql`
  query BaseForks($owner: String!, $name: String!, $order: RepositoryOrderField!, $amount: Int = 30, $startCursor: String) {
    repository(name: $name, owner: $owner) {
      forks(orderBy: {field: $order, direction: DESC}, first: $amount, after: $startCursor) {
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

export function getClient (accessToken) {
  if (accessToken === undefined) {
    if (!globalClient) {
      throw Error('Global client not defined, and no access token provided')
    }
    return globalClient
  }

  if (globalToken !== accessToken || !globalClient) {
    const batchedLink = BatchHttpLink({
      uri: 'https://api.github.com/graphql',
      cache: new InMemoryCache(),
      headers: {
        authorization: `bearer ${accessToken}`
      },
      batchMax: 10, // No more than 5 operations per batch
      batchInterval: 20 // Wait no more than 20ms after first batched operation
    })
    const client = new ApolloClient({ link: batchedLink })
    globalClient = client
    globalToken = accessToken
  }
  return globalClient
}

export function getForks (params, client/* optional, defaults to global */) {
  if (client === undefined) {
    client = getClient()
  }
}
