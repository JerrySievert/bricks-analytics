[![build status](https://secure.travis-ci.org/JerrySievert/bricks-analytics.png)](http://travis-ci.org/JerrySievert/bricks-analytics)
# bricks-analytics #

`bricks-analytics` adds basic route analytics and status information about the health of the `http server`.

## Installing ##

    npm install bricks-analytics

## Usage ##

    var analytics = require('bricks-analytics');
    
    appServer.addRoute(".+", analytics, { section: "pre", top: true, keep: 100 /* default 10 */ });

Analytics are then available via two `JSON` requests:

    $ curl http://host.name/bricks-status/analytics.json
    $ curl http://host.name/bricks-status/status.json

or via an `html` page:

    http://host.name/bricks-status/analytics.html

## Methodology

`bricks-analytics` hooks into the call stack during and after execution.  Given that `bricks` uses a `stack-based` routing system, adjustments to start times happen upon request.  Also, given that a `route` can finish before the call stack is fully unwound, actual execution time could be less than the sum of each route.