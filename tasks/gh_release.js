/*
 * grunt-gh-release
 * https://github.com/artpolikarpov/grunt-gh-release
 *
 * Copyright (c) 2013 Artem Polikarpov
 * Licensed under the MIT license.
 */

'use strict';

var curl = require('curlrequest');

module.exports = function(grunt) {

  grunt.registerMultiTask('gh_release', 'Create relases on GitHub from Grunt task.', function () {
    var done = this.async(),
        data = this.data,
        options = this.options({
          // defaults
        });

    curl.request({
      // Create release
      url: 'https://api.github.com/repos/' + options.owner + '/' + options.repo + '/releases',
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github.manifold-preview'
      },
      user: options.token + ':x-oauth-basic',
      data: JSON.stringify({
        tag_name: data.tag_name,
        target_commitish: data.target_commitish || '',
        name: data.name || '',
        body: data.body || '',
        draft: !!data.draft,
        prerelease: !!data.prerelease
      })
    }, function (err, stdout) {
      if (err) {
        done(new Error(err));
      } else {
        var reply;

        try {
          reply = JSON.parse(stdout);
        } catch (e) {};

        if (!reply || reply.errors || !reply.id) {
          done(new Error(reply ? reply.message + '\n' + JSON.stringify(reply.errors, null, '  ') : 'Problems parsing response.'));
        } else {
          grunt.log.ok('Release “' + reply.name + '” has been created.');

          if (data.asset) {
            if (!data.asset.file) done(new Error('Asset error: no file provided.'));
            if (!data.asset['Content-Type']) done(new Error('Asset error: no content type of the asset provided.'));
            if (!data.asset.name) {
              data.asset.name = data.asset.file.replace(/(.*)\/(.*)$/, '$2');
            }

            curl.request({
              // Upload asset
              url: 'https://uploads.github.com/repos/' + options.owner + '/' + options.repo + '/releases/' + reply.id + '/assets?name=' + data.asset.name,
              method: 'POST',
              headers: {
                Accept: 'application/vnd.github.manifold-preview',
                'Content-Type': data.asset['Content-Type']
              },
              user: options.token + ':x-oauth-basic',
              'data-binary': '@' + data.asset.file
            }, function (err, stdout) {
              if (err) {
                done(new Error(err));
              } else {
                var reply;

                try {
                  reply = JSON.parse(stdout);
                } catch (e) {};

                if (!reply || reply.errors || !reply.name) {
                  done(new Error(reply ? reply.message + '\n' + JSON.stringify(reply.errors, null, '  ') : 'Problems parsing response.'));
                } else {
                  grunt.log.ok('Release asset “' + reply.name + '” has been ' + reply.state + '.');
                }
              }

              done();
            });
          } else {
            done();
          }
        }
      }
    })
  });

};
