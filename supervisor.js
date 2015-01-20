var child_process = require("child_process");
var numCPUs = require("os").cpus().length;

var Supervisor = function(data, dependencies, opts){
  var self = this;
  this.workers = [];
  this.available = [];
  this.err = null;
  this.callback = null;
  this.numWorkers = Math.min(data.length, opts.CPUs) || Math.min(data.length, numCPUs - 1);
  this.dependencies = {};
  this.data = data;

  var _workerInterface = function(){
    // console.log("Register worker event handlers");
    for (var i = 0; i < self.numWorkers; i++){
      self.workers[i].id = i;
      self.workers[i].on("message", function(msg){
        self.available.push(this.id);
        _updateData(msg.key, msg.value);
        _process();
      });
    }
  };

  var _updateData = function(key, value){
    self.data[key] = value;
  };

  var _registerTasks = function(tasks){
    var msg = {};
    msg.tasks = tasks;
    msg.type  = "registerTasks";
    for (var i = 0; i < self.numWorkers; i++){
      self.workers[i].send(msg);
    }
  };

  this.registerDependencies = function(){
    for (var i = 0; i < self.numWorkers; i++){
      var task = {
        type: "require",
        dependencies: self.dependencies
      };
      self.workers[i].send(task);
    }
  };

  this.init = function(){
    self.dependencies = dependencies;
    for (var i = 0; i < self.numWorkers; i++){
      self.workers.push(child_process.fork(__dirname + '/child.js'));
      self.available.push(i);
    }
    self.registerDependencies();
    _workerInterface();
  };
  self.init();

  this.apply = function(funcs, callback){
    _registerTasks(funcs);
    self.callback = callback;
    _executioner();
  };

  var _process = function(){
    if (self.it < self.data.length){
      _executioner();
    } else {
      self.callback(self.err, self.data);
    }
  };

  this.it = 0;
  var _executioner = function(){
    if (self.available.length > 0){
      var temp = self.available.shift();
      var task = {
        type: "execute",
        datum:  self.data[self.it],
        key: self.it
      };
      self.workers[temp].send(task);
      self.it++;
    }
  };

  return self;
};

module.exports = exports = Supervisor;
