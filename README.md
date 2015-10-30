# CompleteIt.js


CompleteIt.js is a small library to autocomplete results in search inputs.
It is designed to work with a remote endpoint that serves autocomplete results
(i.e. ElasticSearch, Zend).

CompleteIt.js provides an UI to show and select autocomplete results.

CompleteIt.js is designed to prevent an excessive number of requests to the
remote endpoint.
To achieve this, it comes with a built-in throttling mechanism for remote requests
and with an aggressive caching mechanism.
The only dependency is [`lodash.throttle`](https://lodash.com/).

CompleteIt.js is built with [Brunch](http://brunch.io).

## Usage Example

CompleteIt.js has to be attached to a `form` that contains an `input`.

```javascript
var CompleteIt = require('complete-it');

var form = document.body.querySelector('#autocomplete');
CompleteIt.init(form);
```

## Options

*  `throttleTime`: the minimum interval between remote queries. *(default: 500ms)*.
*  `minLength`: the autocomplete starts if the input value length is at least `minLength`. *(default: 5)*.
*  `cache`: describes the cache strategy. More info in [cache section](#cache).
*  `middleware`: is the function applied to ajax callback. More info in [middleware section](#middleware).
*  `cacheExpires`: the cache will expires in `cacheExpires`. The value is in seconds. *default: 604800 (1 week)*.

## Cache

There are three cache strategies provided out of the box: `memory`, `localStorage` and `sessionStorage`.
The first one, `memory`, simply store the remote queries in a local array of objects and it
resets at every page reload.
The others use `localStorage` and `sessionStorage` to have a persistent cache.
You can also set `cache` to `false` if you always want fresh results from server.
This options defaults to `localStorage` and silently degrades to `memory` if there is no `localStorage`
support.

## Ajax

CompleteIt.js allows you to use the ajax library you prefer. 
Its `ajax` option accepts a Promise and it will use the results always in the same way,
without being influenced by the ajax library that you will choose.
In this way you can also use your specific option for the remote query and CompleteIt.js
doesn't need to know anything.
The `ajax` options accepts a parameter (`value`) that corresponds to the current input value.
The response from the request will be passed to [middleware function](#middleware) and then
processed by the library.

### jQuery example

This example uses [jQuery](https://jquery.com) ajax method, passing some custom options.
  
```javascript
var CompleteIt = require('complete-it');

var $form = $('#autocomplete');
CompleteIt.init($form.get(0), {
  ajax: function (value) {
    return $.ajax({
      url: 'http://example.org/some-remote-endpoint',
      crossDomain: true, // Custom
      cookies: true,     // options.
      data: {
        q: value // Take the value from input
      }
    });
  }
});
```

### reqwest example

This example uses [reqwest](https://github.com/ded/reqwest).
  
```javascript
var reqwest = require('reqwest');
var CompleteIt = require('complete-it');

var form = document.body.querySelector('#autocomplete');

CompleteIt.init(form, {
  ajax: function (value) {
    return reqwest({
      url: 'http://example.org/some-remote-endpoint',
      method: 'post',
      data: {
        q: value // Take the value from input
      }
    });
  }
});
```

## middleware

CompleteIt.js is designed only to provide an UI for the autocomplete and for throttle and cache
the remote queries. 
It doesn't want to know anything about your results.
To make things simple CompleteIt.js assumes that the result of the remote query is an array of objects,
each object with a `content` key with the content of the autocomplete. This array should also be ordered
as you want.
To uniform your result with the form requested by the library you have the `middleware` option.
It accepts, two parameters (`results`, the response received from the query and `input`, the current
input value).
With this option you can also manipulate the order and form of your results, if you need to do it at
client side.

### Standard form of response

This is the array of object that ***MUST*** return from `middleware`.

```
[
  {
    'content': 'An autocompleted result'
  },
  {
    'content': 'Another autocompleted result'
  }
  ...
]
```

### middleware basic example

This example simply change the content key. The response objects contains the autocompleted result
in the `text` key that will be changed to the required `content` key, using [lodash](https://lodash.com/) `map` method.

```javascript
var CompleteIt = require('complete-it');

var form = document.body.querySelector('#autocomplete');

CompleteIt.init(form, {
  middleware: function (results, value) {
    var temporaryElements = _.map(results, function(element) {
      element.content = element.text; // Use the `content` key
      return element;
    });
    return temporaryElements;
  }
});
```

Don't worry if your response contains unuseful keys, CompleteIt.js will clean it for you.


### middleware order example

This example change the `content` key and order the results by a `_score` key, using [lodash](https://lodash.com/) `map` and `orderBy`
methods.

```javascript
var CompleteIt = require('complete-it');

var form = document.body.querySelector('#autocomplete');

CompleteIt.init(form, {
  middleware: function (results, value) {
    var temporaryElements = _.map(results, function(element) {
      element.content = element.text; // Use the `content` key
      return element;
    });
    // Order elements by `_score` key.
    temporaryElements = _.sortBy(temporaryElements, function (element) {
      return element._score;
    }); 

    return temporaryElements;
  }
});
```

## Markup

The markup is really simple. When initialized the library will inject a ghost input (with `.ghost-input` class),
used to show the first autocompleted result in the input and a `ul` with `.list` class that will be filled
with the autocomplete results.
The `current` result, selected with mouse or keyboard, receives the `current` class. 

## Contributing

```
git clone https://github.com/dehlic/completeIt
npm install
npm start
```

## Browser support

* IE10+ (`classList` support is missing in IE<10. Extend support with [polyfill](https://github.com/eligrey/classList.js)
* Chrome 8+
* Firefox 3.6+
* Safari 5.1+
* Opera 11.5+

```
Happy [autocom               ] [GO!]
      |autocomplete          |
      |autocompleting results|
      |autocompleting stuff  |
```
