# CompleteIt.js


CompleteIt.js is a small library to autcomplete results in search inputs.
It is designed to work with a remote endpoint that serves autocomplete results,
(i.e. ElasticSearch, Zend).

Autocomplete results will be ordered by score field, and each result will be
cached with localStorage (if supported) or in memory (actually only in memory).

Dependencies are jQuery and lodash (underscore).
jQuery will be probably dropped.

CompleteIt.js is built with [Brunch](http://brunch.io).

## Options

* `actionUrl`: the url to make autocomplete queries (defaults to form action)
* `throttleTime`: the minimum interval between remote queries (defaults to 500ms)
* `minLength`: the autocomplete starts if the input value length is at least `minLength`
* `resultKey`: is the key in the ajax response object that contains autocomplete results
* `elementContentKey`: is the key in each result element that contains the autocomplete text
* `elementScoreKey`: is the key in each result element that contains the score used to order results
* `crossDomain`: expose jQuery Ajax option
* `cookies`: expose jQuery Ajax option

