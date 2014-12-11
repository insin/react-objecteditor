'use strict';

var React = require('react/addons')

var cx = React.addons.classSet

/**
 * Gets just type info from an object's toString, in lower case.
 */
function getType(o) {
  return Object.prototype.toString.call(o).slice(8, -1).toLowerCase()
}

/**
 * Gets an appropriate editor constructor based on the given object's type.
 */
function getEditorCtor(o) {
  var type = getType(o)
  var Editor = TYPE_TO_EDITOR[type]
  if (!Editor) {
    throw new Error('No editor available for type: ' + type)
  }
  return Editor
}

/**
 * Creates an object containing the given prop and value.
 */
function makeObj(prop, value) {
  var update = {}
  update[prop] = value
  return update
}

// Container editors

/**
 * Mixin for editors which can be top-level containers (Objects or Arrays).
 */
var ContainerEditorMixin = {
  propTypes: {
    editing: React.PropTypes.bool,
    onChange: React.PropTypes.func
  },
  /**
   * Top-level editors won't have had a "prop" property passed to them by a
   * containing editor.
   */
  isTopLevel() {
    return (typeof this.props.prop == 'undefined')
  },
  /**
   * The presence of an "editing" property on a top-level editor controls
   * whether or not it can be used for editing, in which case it will take an
   * initial reference to its value object as state.
   */
  isEditable() {
    return (this.isTopLevel() && typeof this.props.editing != 'undefined')
  },
  getInitialState() {
    var initialState = {adding: false}
    if (this.isEditable()) {
      initialState.value = this.props.value
    }
    return initialState
  },
  /**
   * If an editor is being used to edit an object, we need to keep its state
   * up to date with any prop changes.
   */
  componentWillReceiveProps(newProps) {
    if (this.isEditable() && newProps.value !== this.props.value) {
      this.setState({value: newProps.value})
    }
  },
  shouldComponentUpdate(nextProps, nextState) {
    return (nextProps.editing !== this.props.editing ||                  // switching modes
            this.isEditable() && nextState.value !== this.state.value || // editable value updated
            nextProps.value !== this.props.value ||                      // display value updated
            nextState.adding != this.state.adding)                       // adding flag toggled
  },
  /**
   * Child editors will bubble up objects representing state changes in the
   * format React.addons.update expects. Top-level components are responsible
   * for applying the state changes.
   */
  onChange(update) {
    if (this.isTopLevel()) {
      var newState = React.addons.update(this.state, {value: update})
      this.setState(newState)
      if (this.props.onChange) {
        this.props.onChange(newState.value)
      }
    }
    else {
      this.props.onChange(makeObj(this.props.prop, update))
    }
  },
  /**
   * Getter for the object being displayed/edited, as top-level containers hold
   * the object as state.
   */
  getValue() {
    return (this.state.value || this.props.value)
  },
  toggleAdding() {
     this.setState({adding: !this.state.adding})
  }
}

var ObjectEditor = React.createClass({
  mixins: [ContainerEditorMixin],
  propTypes: {
    value: React.PropTypes.object
  },
  handleAdd(newProp, obj) {
    this.setState({adding: false}, () => {
      this.onChange(makeObj(newProp, {$set: obj}))
    })
  },
  validateProp(prop) {
    return (prop && !Object.prototype.hasOwnProperty.call(this.getValue(), prop))
  },
  render() {
    return <table className="object"><tbody>
      <tr className="brace">
        <td colSpan="2">
          {'{ '}
          {this.props.editing && (this.state.adding
           ? <AddProperty
               onAdd={this.handleAdd}
               onCancel={this.toggleAdding}
               placeholder="prop name"
               onValidateProp={this.validateProp}
             />
           : <button type="button" onClick={this.toggleAdding}>+</button>
           )}
        </td>
      </tr>
      {this.renderProps()}
      <tr className="brace"><td colSpan="2">}</td></tr>
    </tbody></table>
  },
  renderProps() {
    var obj = this.getValue()
    var rendered = []
    Object.keys(obj).forEach(prop => {
      var value = obj[prop]
      var Editor = getEditorCtor(value)
      rendered.push(<tr className="line" key={prop}>
        <td className="prop">{prop}</td>
        <td className="value">
          <Editor prop={prop}
                  value={value}
                  editing={this.props.editing}
                  onChange={this.onChange} />
        </td>
      </tr>)
    })
    return rendered
  }
})

var ArrayEditor = React.createClass({
  mixins: [ContainerEditorMixin],
  propTypes: {
    value: React.PropTypes.array
  },
  handleAdd(index, obj) {
    this.setState({adding: false}, () => {
      index = (index === '' ? this.getValue().length : Number(index))
      this.onChange({$splice: [[index, 0, obj]]})
    })
  },
  validateIndex(index) {
    if (/^\d+$/.test(index)) {
      return (Number(index) <= this.getValue().length)
    }
    return (index === '')
  },
  render() {
    return <table className="array"><tbody>
      <tr className="brace">
        <td colSpan="2">
          [
          {this.props.editing && (this.state.adding
           ? <AddProperty
               onAdd={this.handleAdd}
               onCancel={this.toggleAdding}
               placeholder="index"
               defaultProp={String(this.getValue().length)}
               onValidateProp={this.validateIndex}
             />
           : <button type="button" onClick={this.toggleAdding}>+</button>
           )}
        </td>
      </tr>
      {this.renderProps()}
      <tr className="brace"><td colSpan="2">]</td></tr>
    </tbody></table>
  },
  renderProps() {
    var arr = this.getValue()
    var rendered = []
    for (var i = 0, l = arr.length; i < l; i++) {
      var value = arr[i]
      var Editor = getEditorCtor(value)
      rendered.push(<tr className="line">
        <td className="prop">{i}</td>
        <td className="value">
          <Editor prop={i}
                  value={value}
                  editing={this.props.editing}
                  onChange={this.onChange} />
        </td>
      </tr>)
    }
    return rendered
  }
})

// Value editors

/**
 * Mixin for editors which can't be top-level containers (value objects).
 */
var ValueEditorMixin = {
  propTypes: {
    editing: React.PropTypes.bool,
    onChange: React.PropTypes.func
  }
}

var BooleanEditor = React.createClass({
  mixins: [ValueEditorMixin],
  propTypes: {
    value: React.PropTypes.bool
  },
  onChange(e) {
    this.props.onChange(makeObj(this.props.prop, {$set: e.target.checked}))
  },
  render() {
    if (!this.props.editing) {
      return <div className="boolean">{Boolean(this.props.value).toString()}</div>
    }
    return <div className="boolean">
      <input type="checkbox" checked={this.props.value} onChange={this.onChange}/>
    </div>
  }
})

var DateEditor = React.createClass({
  mixins: [ValueEditorMixin],
  propTypes: {
    value: React.PropTypes.instanceOf(Date)
  },
  getInitialState(date) {
    date = date || this.props.value
    return {
      errorMessage: null,
      input: date.toISOString().substring(0, 10)
    }
  },
  componentWillReceiveProps(newProps) {
    if (newProps.value !== this.props.value) {
      this.setState(this.getInitialState(newProps.value))
    }
  },
  onChange(e) {
    this.setState({input: e.target.value}, () => {
      var errorMessage = null
      try {
        var newDate = new Date(this.state.input)
      }
      catch (e) {
        errorMessage = e.message
      }
      if (errorMessage === null &&
          (isNaN(newDate) || newDate.toString() == 'Invalid Date')) {
        errorMessage = 'Invalid Date'
      }
      if (errorMessage === null) {
        this.props.onChange(makeObj(this.props.prop, {$set: newDate}))
      }
      else {
        this.setState({errorMessage: errorMessage})
      }
    })
  },
  render() {
    if (!this.props.editing) {
      return <div className="date">{this.state.input}</div>
    }
    return <div className="date">
      <input type="date" value={this.state.input} onChange={this.onChange}/>
      {this.state.errorMessage && <p className="error">{this.state.errorMessage}</p>}
    </div>
  }
})

var NumberEditor = React.createClass({
  mixins: [ValueEditorMixin],
  propTypes: {
    value: React.PropTypes.number
  },
  getInitialState(num) {
    num = num || this.props.value
    return {
      errorMessage: null,
      input: num
    }
  },
  componentWillReceiveProps(newProps) {
    if (newProps.value !== this.props.value) {
      this.setState(this.getInitialState(newProps.value))
    }
  },
  onChange(e) {
    this.setState({input: e.target.value}, () => {
      var newNumber = Number(this.state.input)
      if (!isNaN(newNumber)) {
        this.props.onChange(makeObj(this.props.prop, {$set: newNumber}))
      }
      else {
        this.setState({errorMessage: 'Not a number'})
      }
    })
  },
  render() {
    if (!this.props.editing) {
      return <div className="number">{this.state.input}</div>
    }
    return <div className="number">
      <input type="number" step="any" value={this.state.input} onChange={this.onChange}/>
      {this.state.errorMessage && <p className="error">{this.state.errorMessage}</p>}
    </div>
  }
})

var RegExpEditor = React.createClass({
  mixins: [ValueEditorMixin],
  propTypes: {
    value: React.PropTypes.instanceOf(RegExp)
  },
  getInitialState(re) {
    re = re || this.props.value
    return {
      g: re.global,
      i: re.ignoreCase,
      m: re.multiline,
      source: re.source,
      errorMessage: null
    }
  },
  getFlags() {
    var flags = []
    if (this.state.g) { flags.push('g') }
    if (this.state.i) { flags.push('i') }
    if (this.state.m) { flags.push('m') }
    return flags.join('')
  },
  componentWillReceiveProps(newProps) {
    if (newProps.value !== this.props.value) {
      this.setState(this.getInitialState(newProps.value))
    }
  },
  onChange(e) {
    var stateChange = {errorMessage: null}
    if (e.target.name == 'source') {
      stateChange.source = e.target.value
    }
    else {
      stateChange[e.target.name] = e.target.checked
    }
    this.setState(stateChange, () => {
      try {
        var newRegExp = new RegExp(this.state.source, this.getFlags())
        this.props.onChange(makeObj(this.props.prop, {$set: newRegExp}))
      }
      catch (e) {
        this.setState({errorMessage: e.message})
      }
    })
  },
  render() {
    if (!this.props.editing) {
      return <div className="regexp">/{this.state.source}/{this.getFlags()}</div>
    }
    return <div className="regexp" onChange={this.onChange}>
      /<input type="text" name="source" value={this.state.source}/>/{' '}
      <label><input type="checkbox" name="g" checked={this.state.g}/>g</label>{' '}
      <label><input type="checkbox" name="i" checked={this.state.i}/>i</label>{' '}
      <label><input type="checkbox" name="m" checked={this.state.m}/>m</label>
      {this.state.errorMessage && <p className="error">{this.state.errorMessage}</p>}
    </div>
  }
})

var StringEditor = React.createClass({
  mixins: [ValueEditorMixin],
  propTypes: {
    value: React.PropTypes.string
  },
  onChange(e) {
    this.props.onChange(makeObj(this.props.prop, {$set: e.target.value}))
  },
  render() {
    if (!this.props.editing) {
      return <div className="string">{this.props.value}</div>
    }
    return <div className="string">
      <input type="text" value={this.props.value} onChange={this.onChange}/>
    </div>
  }
})

// Other components

var AddProperty = React.createClass({
  propTypes: {
    defaultProp: React.PropTypes.string
  , onAdd: React.PropTypes.func.isRequired
  , onCancel: React.PropTypes.func.isRequired
  , onValidateProp: React.PropTypes.func
  , placeholder: React.PropTypes.string
  },
  getDefaultProps() {
    return {
      placeholder: ''
    , onValidateProp(prop) { return true }
    }
  },
  getInitialState() {
    return {
      prop: this.props.defaultProp || ''
    , type: Object.keys(TYPE_TO_FACTORY)[0]
    , hasChanged: false
    }
  },
  componentDidMount() {
    this.refs.prop.getDOMNode().focus()
  },
  shouldComponentUpdate(nextProps, nextState) {
    return (this.state !== nextState)
  },
  handleChange(e) {
    var el = e.target
    var change = makeObj(el.name, {$set: el.value})
    if (!this.state.hasChanged) {
      change.hasChanged = {$set: true}
    }
    var newState = React.addons.update(this.state, change)
    this.setState(newState)
  },
  handleKeyDown(e) {
    if (e.key == 'Enter') {
      this.handleAdd()
    }
    else if (e.key == 'Escape') {
      this.handleCancel()
    }
  },
  handleAdd() {
    if (this.props.onValidateProp(this.state.prop)) {
      this.props.onAdd(this.state.prop, TYPE_TO_FACTORY[this.state.type]())
    }
  },
  handleCancel() {
    this.props.onCancel()
  },
  render() {
    return <span onKeyDown={this.handleKeyDown}>
      <input type="text" name="prop" ref="prop" value={this.state.prop}
        className={cx({invalid: this.state.hasChanged && !this.props.onValidateProp(this.state.prop)})}
        placeholder={this.props.placeholder}
        onChange={this.handleChange}
      />{' '}
      <select name="type" selectedValue={this.state.type} onChange={this.handleChange}>
        {Object.keys(TYPE_TO_FACTORY).map(type => <option value={type}>{type}</option>)}
      </select>{' '}
      <button type="button" onClick={this.handleAdd}>+</button>{' '}
      <button type="button" onClick={this.handleCancel}>&times;</button>
    </span>
  }
})

var TYPE_TO_EDITOR = {
  array: ArrayEditor
, boolean: BooleanEditor
, date: DateEditor
, number: NumberEditor
, object: ObjectEditor
, regexp: RegExpEditor
, string: StringEditor
}

var TYPE_TO_FACTORY = {
  array() { return [] }
, boolean() { return false }
, date() { return new Date() }
, number() { return  0 }
, object() { return {} }
, regexp() { return new RegExp('') }
, string() { return '' }
}

module.exports = ObjectEditor