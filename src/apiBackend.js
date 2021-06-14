import {
  ApolloClient,
  InMemoryCache,
  gql
} from '@apollo/client'
import { BatchHttpLink } from '@apollo/client/link/batch-http'

let globalToken = ''
let globalClient = null

const RepositoryOrderField = {
  PUSHED_AT: 'PUSHED_AT',
  STARRED: 'STARGAZERS'
}

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
    stargazers(orderBy: {field: STARRED_AT, direction: ASC}, first: 5) {
      nodes {
        id
      }
    }
  }
`

// Query to get all repositories and subforks 2 levels down with varying numbers of returned repositories.
const INITIAL_QUERY = gql`
  ${CORE_REPO_FIELDS}
  query Main($owner: String!, $name: String!, $baseAmount: Int = 50, $subforkAmount: Int = 4) {
    repository(name: $name, owner: $owner) {
      ...RepoFields
      recentForks: forks(orderBy: {field: PUSHED_AT, direction: DESC}, first: $baseAmount) {
        nodes {
          ...RepoFields
          recentForks: forks(orderBy: {field: PUSHED_AT, direction: DESC}, first: $subforkAmount) {
            nodes {
              ...RepoFields
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
          starredForks: forks(orderBy: {field: STARGAZERS, direction: DESC}, first: $subforkAmount) {
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
      starredForks: forks(orderBy: {field: STARGAZERS, direction: DESC}, first: $baseAmount) {
        nodes {
          ...RepoFields
          recentForks: forks(orderBy: {field: PUSHED_AT, direction: DESC}, first: $subforkAmount) {
            nodes {
              ...RepoFields
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
          starredForks: forks(orderBy: {field: STARGAZERS, direction: DESC}, first: $subforkAmount) {
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

function getCompareUrl (sourceRepoData, compareRepoData) {
  return `https://api.github.com/repos/${
    sourceRepoData.nameWithOwner
  }/compare/${
    sourceRepoData.owner.login
  }:${
    sourceRepoData.defaultBranchRef.name
  }...${
    compareRepoData.owner.login
  }:${
    compareRepoData.defaultBranchRef.name
  }?per_page=1`
}

function getBaseUrl(owner, name) {
  return `https://api.github.com/repos/${owner}/${name}`
}

export function getSourceRepoFullName(owner, name) {
  if (globalToken !== undefined && globalToken !== '') {
    return fetch(getBaseUrl(owner, name), {
      headers: {
        Authorization: `token ${globalToken}`
      }
    }).then(data => data.json())
    .then((json)_=> {
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



export async function compareRepos (sourceRepoData, compareRepoData) {
  if (globalToken !== undefined && globalToken !== '') {
    return fetch(getCompareUrl(sourceRepoData, compareRepoData), {
      headers: {
        Authorization: `token ${globalToken}`
      }
    }).then(data => data.json())
  } else {
    throw Error('Global token was not defined before executing compare action')
  }
}

export function setupClient (accessToken) {
  if (accessToken === undefined) {
    throw Error('Cannot setup client without access token')
  }

  if (globalToken !== accessToken || !globalClient) {
    const batchedLink = BatchHttpLink({
      uri: 'https://api.github.com/graphql',
      cache: new InMemoryCache(),
      headers: {
        authorization: `token ${accessToken}`
      },
      batchMax: 10, // No more than 5 operations per batch
      batchInterval: 20 // Wait no more than 20ms after first batched operation
    })
    globalClient = new ApolloClient({ link: batchedLink })
    globalToken = accessToken
  }
}

export async function getForks (owner, name, order, amount) {
  if (!owner || !name) {
    throw Error(`Owner and name must be provided in getForks, but received owner: ${owner} and name ${name}`)
  }
  const variables = {
    owner: owner,
    name: name
  }
  if (order) {
    if (order in RepositoryOrderField) {
      throw Error(`Expected to receive one of ${RepositoryOrderField}, but instead got ${order}`)
    }
    variables.order = order
  }
  if (amount) {
    if (typeof amount !== "Int") {
      throw Error(`amount should be an integer, but was ${typeof amount}`)
    }
    variables.amount = amount
  }
  if (!globalClient) {
    throw Error('Please setup global client by calling setupClient(token) first')
  }

  return globalClient.query({
    query: SINGLE_REPO_QUERY,
    variables: variables
  }).then((result) => {
    console.log(result)
    return result
  }).catch((error) => {
    console.error(error)
  })
}

export async function getMainData (owner, name, baseQueryAmount, subforkQueryAmount) {
  if (!owner || !name) {
    throw Error(`Owner and name must be provided in getForks, but received owner: ${owner} and name ${name}`)
  }
  const variables = {
    owner: owner,
    name: name
  }
  if (baseQueryAmount) {
    if (typeof baseQueryAmount !== "Int") {
      throw Error(`baseQueryAmount should be an integer, but was ${typeof baseQueryAmount}`)
    }
    variables.baseQueryAmount = baseQueryAmount
  }
  if (subforkQueryAmount) {
    if (typeof baseQueryAmount !== "Int") {
      throw Error(`subforkQueryAmount should be an integer, but was ${typeof subforkQueryAmount}`)
    }
    variables.subforkQueryAmount = subforkQueryAmount
  }
  if (!globalClient) {
    throw Error('Please setup global client by calling setupClient(token) first')
  }

  return globalClient.query({
    query: INITIAL_QUERY,
    variables: variables
  }).then((result) => {
    console.log(result)
    return result
  }).catch((error) => {
    console.error(error)
  })
}