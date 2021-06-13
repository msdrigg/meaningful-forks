(async function () {
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

  async function handleTransitions () {
    // Authorization header
    const headerObj = new Headers()
    headerObj.append('Authorization', 'token ' + ACCESS_TOKEN)
    const auth = { headers: headerObj }

    // Show loading gif while sorting forks
    const loading = document.createElement('span')
    const statusText01 = '📊 Meaningful Forks is gathering data...'
    const statusText02 = '✨ Updating stars...'
    const statusText03 = '🍴 Sorting forks (might take a sec)...'
    const statusText04 = '🔀 Rearranging order...'
    loading.innerText = statusText01
    loading.style.background = '#22f922'
    loading.style.borderRadius = '10px'
    loading.style.color = 'black'
    loading.style.fontWeight = 'bold'
    loading.style.padding = '10px'
    loading.style.width = 'max-content'
    loading.style.height = 'calc(20px + 1.5em)' // pad + line height
    loading.style.bottom = 'calc(10vh - 40px)'
    loading.style.left = '0'
    loading.style.right = '0'
    loading.style.zIndex = '9999'
    loading.style.position = 'fixed'
    loading.style.margin = '0 auto'
    document.body.appendChild(loading)

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
                  if (DEBUG_LEVEL < 5) { console.error('Error getting recently updated user: ') }
                  if (DEBUG_LEVEL < 5) console.log(err)
                })
            }
          })
        )
      })
      .catch((err) => {
        if (DEBUG_LEVEL < 5) { console.error('Error getting recently updated user: ') }
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
          if (DEBUG_LEVEL < 2) { console.log(`${fork.full_name} has ${fork.forks} subforks`) }
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
    if (DEBUG_LEVEL < 2) { console.log(`Found ${subForks.length} relevant subforks`, subForks) }
    let forks = mainForks.concat(subForks)
    if (DEBUG_LEVEL < 2) console.log('TCL: forks.length: ' + forks.length)
    const stargazerCheckPromises = []
    let badForks = []
    loading.innerText = statusText02
    await Promise.all(
      forks.map(async (fork, index, forks) => {
        // like: mcanthony
        if (fork.owner === undefined) {
          if (DEBUG_LEVEL < 2) { console.log('marking bad fork for delete', index, fork) }
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

    if (DEBUG_LEVEL < 2) console.log('Beginning of DOM operations!')
    forks.reverse().forEach((fork) => {
      if (DEBUG_LEVEL < 2) console.log('TCL: fork', fork)
      // if (fork.owner.login === 'undefined') { return; }
      const forkName = fork.full_name // like: mcanthony/lovely-forks
      const starCount = fork.stargazers_count
      // if (DEBUG_LEVEL < 2) console.log(forkName, starCount);
      let hasRepo = false // the repo is listed on the current page
      const repos = network.querySelectorAll('div.repo')
      const treeSvg = repos.length > 2 ? repos[1].querySelector('svg') : undefined
      for (let i = 0; i < repos.length; i++) {
        // like: mcanthony/lovely-forks, remove the first "/" in url by substring(1) in repoName
        const href = repos[i].lastElementChild.getAttribute('href')
        if (href) {
          const repoName = href.substring(1)
          // if (DEBUG_LEVEL < 2) console.log(href, repoName, forkName, i);
          if (repoName === forkName) {
            hasRepo = true
            if ('is_subfork' in fork && fork.is_subfork) {
              if (DEBUG_LEVEL < 2) console.log('adding dagger to subfork')
              // the normal L won't make sense because subforks are ranked at the same level now
              const dagger = document.createTextNode('\u2021')
              const svgs = repos[i].querySelectorAll('svg')
              if (treeSvg) svgs[0].replaceWith(treeSvg.cloneNode(true))
              svgs[1].replaceWith(dagger)
            }
            addStatus(repos[i])
            break // no need to keep searching after we found it
          }
        }
      }
      // if api returned a user whose repo is not displayed on the current page
      // max seems to be 1000 displayed repos
      if (!hasRepo) {
        if (DEBUG_LEVEL < 2) console.log(`${forkName} repo wasn't showing`)
        let repoDiv = createRepoDiv(document, fork)
      } 
    }
    // Finished sorting
    // remove loading gif
    if (DEBUG_LEVEL < 2) console.log('finished sorting')
    loading.remove()

    async function getFromApi (url, properties) {
      const json = await fetch(url, auth).then((data) => data.json())
      // if (data.ok) {
      //   json = await data.json();
      // } else {
      //   throw new Error("Network response is not OK!");
      // }
      if (typeof properties === 'string') {
        return processPropertyChain(json, properties)
      } else if (Array.isArray(properties)) {
        return properties.map((property) => {
          return processPropertyChain(json, property)
        })
      }

      function processPropertyChain (json, property) {
        if (property.indexOf('.') >= 0) {
          let result = json
          const propertyChain = property.split('.')
          propertyChain.forEach((property) => {
            result = result[property]
          })
          return result
        } else {
          return json[property]
        }
      }
    }

    async function getDefaultBranch (repoName) {
      const defaultBranchUrl = `https://api.github.com/repos/${repoName}`
      return getFromApi(defaultBranchUrl, 'default_branch')
    }

    function removeBadForks (indexes) {
      for (let i = 0; i < indexes.length; i++) {
        if (DEBUG_LEVEL < 2) console.log('deleting:', forks[indexes[i]])
        delete forks[indexes[i]]
      }
      forks = forks.filter((el) => {
        return el !== undefined
      })
      if (DEBUG_LEVEL < 2) console.log(`${forks.length} remaining forks`)
      return []
    }
  }

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
  async function waitForKeyElements (selectorTxt, actionFunction) {
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
  await waitForKeyElements('#network>.repo', handleTransitions)
})()
