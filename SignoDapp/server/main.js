import { Meteor } from 'meteor/meteor';
Certificates = new Mongo.Collection('certificates');
Meteor.startup(() => {
  // code to run on server at startup
});
