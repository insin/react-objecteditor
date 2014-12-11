# react-objecteditor

An `<ObjectEditor/>` [React](http://facebook.github.io/react) component.

React's [immutability helpers](http://facebook.github.io/react/docs/update.html)
are used when making edits to the object, so the object passed in will not be
mutated.

## Props

`value` (`Object`) - the object to be displayed/edited.

`onChange` (`function(Object)`) - callback which is called with the edited
object on every change.

`editing` (`Boolean`) - if `true`, the object's properties will be editable and
new properties can be added.

## TODO

* Deletion
* Editor config
* Pluggable custom editors

## MIT Licensed
