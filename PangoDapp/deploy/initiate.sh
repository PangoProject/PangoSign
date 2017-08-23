###SCRIPT TO RUN ON CLIENT TO PUSH UPDATED VERSION

#!/bin/bash
set -e

### Configuration ###
###if you change this to your user, 
###you will need SSH access to use this 
###script from your local host
SERVER=chris@67.205.157.187
APP_DIR=/var/www/pangodapp
KEYFILE=
REMOTE_SCRIPT_PATH=/tmp/deploy.sh


### Library ###

function run()
{
  echo "Running: $@"
  "$@"
}


### Automation steps ###

if [[ "$KEYFILE" != "" ]]; then
  KEYARG="-i $KEYFILE"
else
  KEYARG=
fi

if [[ `meteor --version` =~ "Meteor 1.4."* ]]; then
  run meteor build --server-only ../output
  mv ../output/*.tar.gz ./package.tar.gz
else
  run meteor bundle package.tar.gz
fi
run scp $KEYARG package.tar.gz $SERVER:$APP_DIR/
run scp $KEYARG deploy/work.sh $SERVER:$REMOTE_SCRIPT_PATH
echo
echo "---- Running deployment script on remote server ----"
run ssh $KEYARG $SERVER bash $REMOTE_SCRIPT_PATH
