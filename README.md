# meaningful-forks
Sort Github fork lists by the number of stars and commits ahead from the source repo. 

![Angular forks](https://raw.githubusercontent.com/AlienKevin/meaningful-forks/master/demos/angular-forks.PNG)

## Features
* Sort forks according to the number of effective stars (excluding fork author's own star)
* Sort forks according to the number of commits ahead from the source repo (displayed using a green up arrow)
* Show a flame symbol for forks more recent than the source repo

## Installation
1. If you don't already have an userscript manager, we suggest Tampermonkey. [[Chrome]](https://chrome.google.com/webstore/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo) [[Firefox]](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) [[Others]](https://www.tampermonkey.net/)
1. Click here -> [[Install meaningful-forks]](https://github.com/aflowofcode/meaningful-forks/raw/master/dist/script.user.js)
1. (optional) All keys are [rate limited](https://developer.github.com/v3/#rate-limiting). Get your own [Github API token](https://github.com/settings/tokens/new) with `public_repo` permission (or also for private repos, the `repo` permission).<br>Edit meaningful-forks locally (Tampermonkey > meaningful-forks > edit) and paste the key where you see `ACCESS_TOKEN="ENTER_ACCESS_TOKEN_HERE` and then save.

Now you can use meaningful-forks on any github page. To test this, go to the fork page for [Angular](https://github.com/angular/angular/network/members). Your page should look similar to the demo image above.

## Changelog
### 1.2
* Adapt to DOM changes which broke the script
* Improve status box

### 1.1
* Github API auth switched to authorization header token
* Subforks are now included in the ranking (limited to one level below direct forks)

## Credits
Forked from [@AlienKevin](https://github.com/AlienKevin/meaningful-forks)'s, whose creation was inspired by Utkarsh Upadhyay's  [lovely-forks](https://github.com/musically-ut/lovely-forks/).

## License
This project is licensed under the terms of the MIT license.
