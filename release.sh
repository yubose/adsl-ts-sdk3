#!/bin/bash
npm run publish:public

version=`npm view @aitmed/cadl version`
version=`npm view @aitmed/cadl version`
git tag -a $version -m "release a new version: $version"
git push origin $version