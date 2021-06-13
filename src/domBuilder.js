
export const SVG_ICON_TYPES = {
  star: 'star',
  up: 'up',
  flame: 'flame'
}
// Based on: https://github.com/musically-ut/lovely-forks/blob/master/userscript/lovely-forks.user.js
export function createIconSVG (type) {
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('height', 12)
  svg.setAttribute('width', 10.5)
  svg.setAttribute('viewBox', '0 0 14 16')
  svg.style['vertical-align'] = 'middle'
  svg.style.fill = 'currentColor'
  svg.style.position = 'relative'
  svg.style.bottom = '1px'
  svg.style['margin-left'] = '8px'

  svg.classList.add('opticon', 'opticon-' + type)

  const title = document.createElementNS(svgNS, 'title')

  const iconPath = document.createElementNS(svgNS, 'path')
  switch (type) {
    case 'star':
      title.appendChild(
        document.createTextNode(
          "Number of real stars (excluding author's star)"
        )
      )
      iconPath.setAttribute(
        'd',
        'M14 6l-4.9-0.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14l4.33-2.33 4.33 2.33L10.4 9.26 14 6z'
      )
      break
    case 'up':
      title.appendChild(document.createTextNode('Number of commits ahead'))
      iconPath.setAttribute('d', 'M5 3L0 9h3v4h4V9h3L5 3z')
      iconPath.setAttribute('fill', '#84ed47')
      svg.setAttribute('viewBox', '0 0 10 16')
      svg.setAttribute('height', 16)
      break
    case 'flame':
      title.appendChild(
        document.createTextNode('Fork may be more recent than upstream.')
      )
      iconPath.setAttribute(
        'd',
        'M5.05 0.31c0.81 2.17 0.41 3.38-0.52 4.31-0.98 1.05-2.55 1.83-3.63 3.36-1.45 2.05-1.7 6.53 3.53 7.7-2.2-1.16-2.67-4.52-0.3-6.61-0.61 2.03 0.53 3.33 1.94 2.86 1.39-0.47 2.3 0.53 2.27 1.67-0.02 0.78-0.31 1.44-1.13 1.81 3.42-0.59 4.78-3.42 4.78-5.56 0-2.84-2.53-3.22-1.25-5.61-1.52 0.13-2.03 1.13-1.89 2.75 0.09 1.08-1.02 1.8-1.86 1.33-0.67-0.41-0.66-1.19-0.06-1.78 1.25-1.23 1.75-4.09-1.88-6.22l-0.02-0.02z'
      )
      iconPath.setAttribute('fill', '#d26911')
      break
  }

  iconPath.appendChild(title)
  svg.appendChild(iconPath)

  return svg
}

function createRepoDiv (document, repoData) {
  // create repo display
  // <div class="repo">
  //  <img alt="" class="network-tree" src="https://github.githubassets.com/images/modules/network/t.png">
  //  <a class="d-inline-block" data-hovercard-type="organization" data-hovercard-url="/orgs/19dev/hovercard" href="/19dev"><img class="gravatar" src="https://avatars1.githubusercontent.com/u/388995?s=32&amp;v=4" width="16" height="16" alt="@19dev"></a>
  //  <a data-hovercard-type="organization" data-hovercard-url="/orgs/19dev/hovercard" href="/19dev">19dev</a>
  //     /
  //  <a href="/19dev/flatdoc">flatdoc</a>
  // </div>
  const repoDiv = document.createElement('div')
  // Don't treat these as new nodes in ajax checker
  repoDiv.dataset.found = 'alreadyFound'
  repoDiv.classList.add('repo')

  // like: <a data-hovercard-type="organization" data-hovercard-url="/orgs/19dev/hovercard" href="/19dev">19dev</a>
  const ownerType = repoData.owner.type.toLowerCase()
  const nameAnchor = document.createElement('a')
  nameAnchor.setAttribute('data-hovercard-type', ownerType)
  const ownerName = repoData.owner.login
  if (ownerType === 'user') {
    const userId = repoData.owner.id
    nameAnchor.setAttribute(
      'data-hovercard-url',
            `/hovercards?user_id=${userId}`
    )
  } else if (ownerType === 'organization') {
    nameAnchor.setAttribute(
      'data-hovercard-url',
            `/orgs/${ownerName}/hovercard`
    )
    nameAnchor.setAttribute('href', `/${ownerName}`)
  }
  nameAnchor.setAttribute('href', `/${ownerName}`)
  nameAnchor.setAttribute('data-octo-click', 'hovercard-link-click')
  nameAnchor.setAttribute('data-octo-dimensions', 'link_type:self')

  // like: <a class="d-inline-block" data-hovercard-type="organization" data-hovercard-url="/orgs/19dev/hovercard" href="/19dev"><img class="gravatar" src="https://avatars1.githubusercontent.com/u/388995?s=32&amp;v=4" width="16" height="16" alt="@19dev"></a>
  const gravatarAnchor = nameAnchor.cloneNode(true)
  gravatarAnchor.style.paddingLeft = '4px'
  gravatarAnchor.style.paddingRight = '4px'
  // add owner name to nameAnchor after being cloned to gravatarAnchor
  nameAnchor.innerText = ownerName
  gravatarAnchor.classList.add('d-inline-block')
  // <img class="gravatar" src="https://avatars1.githubusercontent.com/u/388995?s=32&amp;v=4" width="16" height="16" alt="@19dev">
  const gravatar = document.createElement('img')
  gravatar.classList.add('gravatar')
  const gravatarUrl = repoData.owner.avatar_url
  gravatar.src = gravatarUrl
  gravatar.width = '16'
  gravatar.height = '16'
  gravatar.alt = `@${ownerName}`
  gravatarAnchor.appendChild(gravatar)

  // like: <a href="/19dev/flatdoc">flatdoc</a>
  const repoAnchor = document.createElement('a')
  repoAnchor.style.paddingRight = '4px'
  repoAnchor.setAttribute('href', `/${forkName}`)
  repoAnchor.innerText = repoData.name

  // Putting parts all together
  repoDiv.appendChild(treeSvg.cloneNode(true))
  repoDiv.appendChild(gravatarAnchor)
  repoDiv.appendChild(nameAnchor)
  repoDiv.appendChild(document.createTextNode(' / '))
  repoDiv.appendChild(repoAnchor)

  addStatus(repoDiv)
}
