/** @jsx React.DOM */


var React = require("react/addons");
var States = require("../constants/States");
var PagedNavComponent = require("../components/PagedNavComponent");
var TaskListComponent = require("../components/TaskListComponent");
var pollResourceMixin = require("../mixins/pollResourceMixin");

module.exports = React.createClass({
    displayName: "TaskViewComponent",

    mixins: [pollResourceMixin],

    propTypes: {
      app: React.PropTypes.object.isRequired,
      currentAppVersion: React.PropTypes.object.isRequired,
      formatTaskHealthMessage: React.PropTypes.func.isRequired,
      hasHealth: React.PropTypes.bool,
      onTasksKilled: React.PropTypes.func.isRequired,
      onTaskDetailSelect: React.PropTypes.func.isRequired
    },

    getInitialState: function() {
      return {
        selectedTasks: {},
        currentPage: 0,
        itemsPerPage: 8,
        tasksFetchState: States.STATE_LOADING
      };
    },

    componentDidMount: function() {
      this.setPollResource(this.fetchTasks);
    },

    componentWillUnmount: function() {
      this.stopPolling();
    },

    handlePageChange: function(pageNum) {
      this.setState({currentPage: pageNum});
    },

    fetchTasks: function() {
      var app = this.props.app;

      app.tasks.fetch({
        error: function() {
          this.setState({tasksFetchState: States.STATE_ERROR});
        }.bind(this),
        success: function(collection, response) {
          // update changed attributes in app
          app.update(response.app);
          this.setState({tasksFetchState: States.STATE_SUCCESS});
        }.bind(this)
      });
    },

    killSelectedTasks: function(options) {
      var _options = options || {};

      var selectedTaskIds = Object.keys(this.state.selectedTasks);
      var tasksToKill = this.props.app.tasks.filter(function(task) {
        return selectedTaskIds.indexOf(task.id) >= 0;
      });

      tasksToKill.forEach(function(task) {
        task.destroy({
          scale: _options.scale,
          success: function () {
            this.props.onTasksKilled(_options);
            delete this.state.selectedTasks[task.id];
          }.bind(this),
          wait: true
        });
      }, this);
    },

    killSelectedTasksAndScale: function() {
      this.killSelectedTasks({scale: true});
    },

    toggleAllTasks: function() {
      var newSelectedTasks = {};
      var modelTasks = this.props.app.tasks;

      // Note: not an **exact** check for all tasks being selected but a good
      // enough proxy.
      var allTasksSelected = Object.keys(this.state.selectedTasks).length ===
        modelTasks.length;

      if (!allTasksSelected) {
        modelTasks.map(function(task) { newSelectedTasks[task.id] = true; });
      }

      this.setState({selectedTasks: newSelectedTasks});
    },

    onTaskToggle: function(task, value) {
      var selectedTasks = this.state.selectedTasks;

      // If `toggleTask` is used as a callback for an event handler, the second
      // parameter will be an event object. Use it to set the value only if it
      // is a Boolean.
      var localValue = (typeof value === Boolean) ?
        value :
        !selectedTasks[task.id];

      if (localValue === true) {
        selectedTasks[task.id] = true;
      } else {
        delete selectedTasks[task.id];
      }

      this.setState({selectedTasks: selectedTasks});
    },

    render: function() {
      var selectedTasksLength = Object.keys(this.state.selectedTasks).length;
      var buttons;

      var tasksLength = this.props.app.tasks.length;
      var itemsPerPage = this.state.itemsPerPage;
      var currentPage = this.state.currentPage;

      /* jshint trailing:false, quotmark:false, newcap:false */
      // at least two pages
      var pagedNav = tasksLength > itemsPerPage ?
        <PagedNavComponent
          className="text-right"
          currentPage={currentPage}
          onPageChange={this.handlePageChange}
          itemsPerPage={itemsPerPage}
          noItems={tasksLength}
          useArrows={true} /> :
        null;


      if (selectedTasksLength === 0) {
        buttons =
          <button className="btn btn-sm btn-info" onClick={this.fetchTasks}>
            ↻ Refresh
          </button>;
      } else {
        // Killing two tasks in quick succession raises an exception. Disable
        // "Kill & Scale" if more than one task is selected to prevent the
        // exception from happening.
        //
        // TODO(ssorallen): Remove once
        //   https://github.com/mesosphere/marathon/issues/108 is addressed.
        buttons =
          <div className="btn-group">
            <button className="btn btn-sm btn-info" onClick={this.killSelectedTasks}>
              Kill
            </button>
            <button className="btn btn-sm btn-info" disabled={selectedTasksLength > 1}
                onClick={this.killSelectedTasksAndScale}>
              Kill &amp; Scale
            </button>
          </div>;
      }

      /* jshint trailing:false, quotmark:false, newcap:false */
      return (
        <div>
          <div className="row">
            <div className="col-sm-6">
              {buttons}
            </div>
            <div className="col-sm-6">
              {pagedNav}
            </div>
          </div>
          <TaskListComponent
            currentPage={currentPage}
            fetchTasks={this.fetchTasks}
            tasksFetchState={this.state.tasksFetchState}
            formatTaskHealthMessage={this.props.formatTaskHealthMessage}
            hasHealth={this.props.hasHealth}
            onTaskToggle={this.onTaskToggle}
            onTaskDetailSelect={this.props.onTaskDetailSelect}
            itemsPerPage={itemsPerPage}
            selectedTasks={this.state.selectedTasks}
            tasks={this.props.app.tasks}
            currentAppVersion={this.props.currentAppVersion}
            toggleAllTasks={this.toggleAllTasks} />
        </div>
      );
    }
  });
