#!/bin/sh
# Xcode Cloud clones the repo and builds ios/App. The web assets it needs are
# NOT in the repo — ios/App/App/public is gitignored, because committing a
# build output that changes on every source edit is how the two drift apart.
#
# So this rebuilds them. Without it the app installs, launches, and shows a
# blank white screen, which looks like a native bug and is not one.
set -e
cd "$CI_PRIMARY_REPOSITORY_PATH"

if ! command -v node > /dev/null 2>&1; then
  brew install node
fi

echo "node $(node --version), npm $(npm --version)"
npm ci
npm run validate          # the same gate CI runs; a bad bank should not ship
npm run build:native
npx cap sync ios

echo "web assets in place:"
ls ios/App/App/public/index.html
