;(async function () {
  // Using let instead of const so minify-es doesnt get too smart and move it away from the beginning
  /** @preserve NOTE: Do NOT release key with source
   */
  const ACCESS_TOKEN = 'ENTER_ACCESS_TOKEN_HERE'

  /** @preserve Number of forks to query
   */
  const FORK_LOAD_COUNT = 50

  /** @preserve Set to <2 for debug, <5 for Errors
   */
  const DEBUG_LEVEL = 3

  /** @preserve Main function handle
   */

  async function handleTransitions() {
    // Authorization header
    const headerObj = new Headers()
    headerObj.append('Authorization', 'token ' + ACCESS_TOKEN)
    const auth = { headers: headerObj }

    // Show loading gif while sorting forks
    const statusText01 = '📊 Meaningful Forks is gathering data...'
    const statusText02 = '✨ Updating stars...'
    const statusText03 = '🍴 Sorting forks (might take a sec)...'
    const statusText04 = '🔀 Rearranging order...'
    const loading = domBuilder.buildLoading(document)
    loading.innerText = statusText01

    // Make sure footer is always visible even if our loading icon obscures it
    document.querySelector('.footer').style['margin-bottom'] = '10vh'

    const network = document.querySelector('#network')

    // like: musically-ut/lovely-forks
    // the first/top line should be the original repo (github no longer labels it specifically)
    const sourceRepoName = network
      .querySelectorAll('.repo')[0]
      .lastElementChild.getAttribute('href')
      .substring(1)
    if (DEBUG_LEVEL < 2) console.log('TCL: currentRepoUrl', sourceRepoName)
    const sourceAuthorName = sourceRepoName.substring(
      0,
      sourceRepoName.lastIndexOf('/')
    )
    // like: https://api.github.com/repos/GhettoSanta/lovely-forks/forks?sort=stargazers&per_page=${FORK_LOAD_COUNT}
    const forkApiUrl = `https://api.github.com/repos/${sourceRepoName}/forks?sort=stargazers&per_page=${FORK_LOAD_COUNT}`
    if (DEBUG_LEVEL < 2) console.log('TCL: forkApiUrl', forkApiUrl)
    const mainForks = await fetch(forkApiUrl, auth)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to get the api url, exiting with status: ${response.status}`
          )
        } else {
          return response.json()
        }
      })
      .then((responseJson) => {
        return responseJson
      })
      .catch((error) => {
        // this happens for unknown reasons on this particular repo, github either purposefully or accidentally doesn't allow it
        // Access to fetch at 'https://api.github.com/repos/github/gitignore/forks?sort=stargazers&per_page=${FORK_LOAD_COUNT}' from origin 'https://github.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled.
        // Sending mode: 'no-cors' along with auth header leads to all requests failing with response.status as 0
        if (DEBUG_LEVEL < 5) console.log(error)
        loading.innerText =
          "Problem accessing API. If you've entered your personal access token & this always happens here, this repo probably doesn't allow API access 😕"
        setTimeout(() => {
          loading.remove()
        }, 7500)
      })
    const mainForksUserMap = {}
    mainForks.forEach((item) => {
      mainForksUserMap[item.full_name] = item
    })

    const oneoffAuth = {
      headers: {
        Authorization: 'token ' + ACCESS_TOKEN,
        Accept: 'application/json'
      }
    }
    await fetch(`https://github.com/${sourceRepoName}/network/meta`, oneoffAuth)
      .then((data) => {
        return data.json()
      })
      .then((json) => {
        if (DEBUG_LEVEL < 2) console.log(JSON.stringify(json, null, 4))
        Promise.all(
          json.users.map(async (user) => {
            const repoFullNape = `${user.name}/${user.repo}`
            if (!(repoFullNape in mainForksUserMap)) {
              await fetch(`https://api.github.com/repos/${repoFullNape}`, auth)
                .then((data) => data.json())
                .then((userJson) => {
                  mainForks.push(userJson)
                  mainForksUserMap[userJson.full_name] = userJson
                })
                .catch((err) => {
                  if (DEBUG_LEVEL < 5) {
                    console.error('Error getting recently updated user: ')
                  }
                  if (DEBUG_LEVEL < 5) console.log(err)
                })
            }
          })
        )
      })
      .catch((err) => {
        if (DEBUG_LEVEL < 5) {
          console.error('Error getting recently updated user: ')
        }
        if (DEBUG_LEVEL < 5) console.log(err)
      })
    let subForks = []
    // if (DEBUG_LEVEL < 2) console.log("TCL: forks", forks.filter(fork => fork.owner.type === "Organization"));

    // subrepos (forks of forks) get out of order if not included in the ranking
    // aside from not displaying the amount of stars or commits which could be relevant
    // so now they are being included, but only one level deep to save time
    await Promise.all(
      mainForks.map(async (fork) => {
        if (fork.forks > 0) {
          if (DEBUG_LEVEL < 2) {
            console.log(`${fork.full_name} has ${fork.forks} subforks`)
          }
          const subforkData = await fetch(
            fork.forks_url + `?sort=stargazers&per_page=${FORK_LOAD_COUNT}`,
            auth
          )
          const tempSubForks = await subforkData.json()

          tempSubForks.forEach((sf) => {
            if (sf.full_name in mainForksUserMap) {
              // We already have this in our map, so we ignore
              // This is possible because we query network/meta
              // which sometimes contains subforks
              return
            }
            // make sure the subforks have actually done something
            if (sf.pushed_at !== fork.pushed_at) {
              sf.is_subfork = true
              sf.forked_from = fork.full_name
              subForks = subForks.concat(sf)
            }
          })
        }
      })
    )
    if (DEBUG_LEVEL < 2) {
      console.log(`Found ${subForks.length} relevant subforks`, subForks)
    }
    const forks = mainForks.concat(subForks)
    if (DEBUG_LEVEL < 2) console.log('TCL: forks.length: ' + forks.length)
    const stargazerCheckPromises = []
    let badForks = []
    loading.innerText = statusText02
    await Promise.all(
      forks.map(async (fork, index, forks) => {
        // like: mcanthony
        if (fork.owner === undefined) {
          if (DEBUG_LEVEL < 2) {
            console.log('marking bad fork for delete', index, fork)
          }
          badForks.push(index)
          return
        }
        const authorName = fork.owner.login
        if (DEBUG_LEVEL < 2) console.log('TCL: authorName', authorName, index)
        if (authorName === 'undefined') {
          return
        } // skip
        const stargazersUrl = fork.stargazers_url
        stargazerCheckPromises.push(
          await fetch(stargazersUrl, auth)
            .then((data) => {
              if (data.ok) {
                return data.json()
              }
              throw new Error('Network response is not OK!')
            })
            .then((stargazers) => {
              // if (DEBUG_LEVEL < 2) console.log("TCL: stargazers", stargazers)
              stargazers.forEach((stargazer) => {
                if (
                  stargazer.login === authorName &&
                  forks[index].stargazers_count > 0
                ) {
                  if (DEBUG_LEVEL < 2) {
                    console.log(
                      `TCL: starCount of ${authorName} before: ${forks[index].stargazers_count}`
                    )
                  }
                  // do not count the author's star
                  forks[index].stargazers_count--
                  if (DEBUG_LEVEL < 2) {
                    console.log(
                      `TCL: starCount of ${authorName} after: ${forks[index].stargazers_count}`
                    )
                  }
                }
              })
            })
            .catch(function (error) {
              if (DEBUG_LEVEL < 5) {
                console.log(
                  'There has been a problem with your fetch operation: ',
                  error.message,
                  fork
                )
              }
            })
        )
      })
    )
    if (DEBUG_LEVEL < 2) {
      console.log(
        `found ${badForks.length} forks with bad data out of ${forks.length}`,
        badForks
      )
    }
    if (badForks.length > 0) {
      badForks = removeBadForks(badForks)
    }

    await Promise.all(stargazerCheckPromises)
    forks.sort(sortBy('stargazers_count', true, parseInt))
    if (DEBUG_LEVEL < 2) console.log('End of modifying stargazer count!')
    loading.innerText = statusText03
    // Get default branch of parent repo (where the current fork is forked from)
    // like: https://api.github.com/repos/GhettoSanta/lovely-forks
    // this only needs to be done once
    const sourceDefaultBranch = await getDefaultBranch(sourceRepoName)
    await asyncForEach(forks, async (fork, index, forks) => {
      try {
        const forkAuthorName = fork.owner.login
        const forkName = fork.full_name // like: mcanthony/lovely-forks
        // Get default branch for current fork
        // let forkDefaultBranch = await getDefaultBranch(forkName);
        // we already have this info
        const forkDefaultBranch = fork.default_branch
        const branchCompareUrl = `https://api.github.com/repos/${forkName}/compare/${sourceAuthorName}:${sourceDefaultBranch}...${forkAuthorName}:${forkDefaultBranch}`

        await getFromApi(branchCompareUrl, ['ahead_by', 'behind_by']).then(
          (aheadBehindTuple) => {
            forks[index].ahead_by = aheadBehindTuple[0]
            forks[index].behind_by = aheadBehindTuple[1]
          }
        )
      } catch (error) {
        if (DEBUG_LEVEL < 5) console.log(error)
      }
      // mark subforks that are not ahead by any commits for delete
      // if (DEBUG_LEVEL < 2) console.log(fork, fork.is_subfork, fork.ahead_by);
      if (fork.is_subfork && fork.ahead_by === 0) {
        if (DEBUG_LEVEL < 2) {
          console.log(
            'marking subfork ahead_by 0 for delete',
            index,
            fork.full_name
          )
        }
        badForks.push(index)
      }
    })

    if (DEBUG_LEVEL < 2) {
      console.log(
        `found ${badForks.length} subforks ahead_by 0 out of ${forks.length}`,
        badForks
      )
    }
    if (badForks.length > 0) {
      badForks = removeBadForks(badForks)
    }
    // if (DEBUG_LEVEL < 2) console.log("TCL: forks", forks);
    // this part appears to happen so fast the status doesn't get updated..
    loading.innerText = statusText04
    forks.sort(
      sortByMultipleFields(
        {
          name: 'stargazers_count',
          primer: parseInt,
          highToLow: true
        },
        {
          name: 'ahead_by',
          primer: parseInt,
          highToLow: true
        },
        {
          name: 'behind_by',
          primer: parseInt,
          highToLow: false
        }
      )
    )

  }
})()
// Taken from https://gist.github.com/mjblay/18d34d861e981b7785e407c3b443b99b
/* A utility function, for UserScripts, that detects
    and handles AJAXed content.

    This is relevant to us because when navigating within a repository on github.com,
    the no traditional reloads occur. Github.com instead uses ajax to handle links. This
    means our script will never load unless the user manually reloads the page.

    For a typical user, the natural navigation flow is to click on the "Insights" tab
    and then click on "Forks". This flow does not activate the userscript until
    the user then reloads the page. With this polling function, the page is loaded
    automatically without reload.

    selectorText:
      The selector string that
      specifies the desired element(s).
    actionFunction:
      The code to run when elements are
      found. It is passed a jNode to the matched
      element.
*/
async function waitForKeyElements(selectorTxt, actionFunction) {
  const targetNodes = document.querySelectorAll(selectorTxt)

  if (targetNodes && targetNodes.length > 0) {
    /* --- Found target node(s).  Go through each and act if they
            are new.
        */
    let runAction = false
    targetNodes.forEach(function (element) {
      if (element.dataset.found !== 'alreadyFound') {
        element.dataset.found = 'alreadyFound'
        runAction = true
      }
    })
    if (runAction) {
      actionFunction().finally(() => {
        setTimeout(() => {
          waitForKeyElements(selectorTxt, actionFunction)
        }, 1000)
      })
      return
    }
  }
  setTimeout(() => {
    waitForKeyElements(selectorTxt, actionFunction)
  }, 1000)
}
waitForKeyElements('#network>.repo', handleTransitions)
