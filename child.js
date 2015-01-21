var child = {};
var path  = require("path");

process.on("message", function(msg){
  switch(msg.type){
    case "require":
      for (var key in msg.dependencies){
        if (msg.dependencies.hasOwnProperty(key)){
          var dir = path.resolve( process.cwd() + "/" + msg.dependencies[key] );
          child[key] = require(dir);
        }
      }
    break;
    case "registerTasks":
      child.tasks = msg.tasks;
    break;
    case "execute":
      var ret_val = msg.datum;
      for (var i = 0; i < child.tasks.length; i++){
        ret_val = child[child.tasks[i].namespace][child.tasks[i].function](ret_val, msg.key);
      }
      var ret_msg = { "key" : msg.key, "value" : ret_val};
      process.send(ret_msg);
    break;
  }
});
