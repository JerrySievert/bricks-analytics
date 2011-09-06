(function () {
    var fs   = require('fs'),
        time = require('microtime');
    
    var requests = [ ];
    var keep     = 10;
    var html     = fs.readFileSync(__dirname + '/htdocs/bricks-status.html');
    var template = fs.readFileSync(__dirname + '/htdocs/handlebars.js');

    var files = {
        'analytics.html': {
            type: 'text/html',
            data: html
        },
        'handlebars.js': {
            type: 'text/javascript',
            data: template
        }
    };

    function analyticsJSON (request, response, options) {
        for (var i = 0; i < requests.length; i++) {
            var analytics = requests[i];

            for (var j = 1; j < analytics.routes.length; j++) {
                analytics.routes[j].start = analytics.routes[j - 1].end;
            }
        }
        
        response.setHeader('Content-Type', 'application/json');
        response.statusCode(200);
        response.write(JSON.stringify(requests));
        response.final();
    }

    function statusJSON (request, response, options) {
        var current = status;
        
        current.memory = process.memoryUsage();

        response.setHeader('Content-Type', 'application/json');
        response.statusCode(200);
        response.write(JSON.stringify(current));
        response.final();
    }

    function statusFile(request, response, filename) {
        response.setHeader('Content-Type', files[filename].type);
        response.statusCode(200);
        response.write(files[filename].data);
        response.final();
    }

    function instrumentedCallRoute (func, request, response, options) {
        var start = time.now();
        func(request, response, options);
        var end = time.now();

        if (response._analytics !== undefined) {
            response._analytics.routes.push({
                start: start,
                end:   end,
                time:  end - start,
                route: options.routeName ? options.routeName : 'unnamed'
            });
        }
    }

    function teardownAnalytics (event, response) {
        var analytics = response._analytics;

        analytics.end = time.now();
        analytics.time = analytics.end - analytics.start;
        analytics.status = response.statusCode();

        requests.push(analytics);
        if (keep) {
            if (requests.length > keep) {
                requests.shift();
            }
        }
    }

    var status = {
        method_option_count:  0,
        method_get_count:     0,
        method_head_count:    0,
        method_post_count:    0,
        method_put_count:     0,
        method_delete_count:  0,
        method_trace_count:   0,
        method_connect_count: 0,
        method_other_count:   0,
        status_other_count:   0,
        status_1XX_count:     0,
        status_2XX_count:     0,
        status_3XX_count:     0,
        status_4XX_count:     0,
        status_5XX_count:     0,
        bytes_transfered:     0,
        requests:             0,
        start_time:           Math.floor(time.now() / 1000)
    };

    function teardownStatus (event, response) {
        var request = response._actual.request;

        switch(request.method) {
          case "OPTION" : status.method_option_count++;  break;
          case "GET"    : status.method_get_count++;     break;
          case "HEAD"   : status.method_head_count++;    break;
          case "POST"   : status.method_post_count++;    break;
          case "PUT"    : status.method_put_count++;     break;
          case "DELETE" : status.method_delete_count++;  break;
          case "TRACE"  : status.method_trace_count++;   break;
          case "CONNECT": status.method_connect_count++; break;
          default: status.method_other_count++; 
        }

        var code = response.statusCode();
        if(code < 100) status.status_other_count++;
        else if(code < 200) status.status_1XX_count++;
        else if(code < 300) status.status_2XX_count++;
        else if(code < 400) status.status_3XX_count++;
        else if(code < 500) status.status_4XX_count++;
        else if(code < 600) status.status_5XX_count++;
        else status.status_other_count++;
        
        status.bytes_transfered += response.length;
        status.requests++;
    }

    exports.name = 'bricks analytics';

    exports.init = function (options) {
        if (options.appServer !== undefined) {
            options.appServer.addRoute("^/bricks-status/analytics.json$", analyticsJSON, { top: true });
            options.appServer.addRoute("^/bricks-status/status.json$", statusJSON, { top: true });
            options.appServer.addRoute("^/bricks-status/analytics.html$", function (request, response) { statusFile(request, response, 'analytics.html'); }, { top: true });
            options.appServer.addRoute("^/bricks-status/handlebars.js$", function (request, response) { statusFile(request, response, 'handlebars.js'); }, { top: true });
            options.appServer.callRoute = instrumentedCallRoute;
        }
        
        if (options.keep !== undefined) {
            keep = options.keep;
        }
    };
    
    
    exports.plugin = function (request, response, options) {
        if (request.url.match("^/bricks-status.+") === null) {
            var analytics = { url: request.url, start: time.now(), routes: [ ] };
            response._analytics = analytics;

            response.callRoute = instrumentedCallRoute;
            response.on('final.complete', teardownAnalytics);
        }

        response.on('final.complete', teardownStatus);
        response.next();
    };
})();