'use strict';

var EventEmitter = require('events').EventEmitter;

var defaultOpts = {
  total: 0,
  size: 50,
  frequency: 100, // ms
  bgDefault: 'white',
  bgSuccess: 'green',
  action: 'Processing: ',
  barStart: '',
  bar: '=',
  barEnd: ''
};

var ProgressBar = module.exports = function(opts) {
  EventEmitter.call(this);
  for(var k in defaultOpts) {
    if (opts[k] === undefined) {
      opts[k] = defaultOpts[k];
    }
  }
  this.opts = opts;
  this.current = 1;
  this.total = this.opts.total;
  this.size = this.opts.size;
  this.startTime = 0;
  this.curTime = 0;
  this.endTime = 0;
  this.charm = require('charm')();
  this.charm.pipe(process.stdout);
};

ProgressBar.prototype = Object.create(EventEmitter.prototype);

ProgressBar.prototype.tick = function(current) {
  if (!this.startTime) {
    this.startTime = Date.now();
    this.emit('start');
  }
  if (this.current >= this.total) return this.finished();
  if (current) this.current = current;
  else this.current++;
  if ((Date.now() - this.curTime) < this.opts.frequency) return;
  this.curTime = Date.now();
  this.output();
};

ProgressBar.prototype.output = function(reset) {

  this.charm.cursor(false);
  this.charm.write(this.opts.action);
  this.charm.write(this.opts.barStart);

  this.charm.foreground(this.opts.bgSuccess);
  this.charm.background(this.opts.bgSuccess);
  for (var i = 0; i < ((this.current / this.total) * this.size) - 1; i++) {
    this.charm.write(' ');
  }

  this.charm.foreground(this.opts.bgDefault);
  this.charm.background(this.opts.bgDefault);
  while (i < this.size - 1) {
    this.charm.write(' ');
    i++;
  }

  this.charm.write(this.opts.barEnd);
  this.charm.display('reset');
  this.charm.left(
    this.opts.action.length +
    this.opts.barStart.length +
    this.size +
    this.opts.barEnd.length
  );
  if (reset) {
    this.charm.cursor(true);
    this.charm.down(1);
  }
};

ProgressBar.prototype.finished = function() {
  this.output(true); // ensure the bar is full and the cursor position is reset.
  this.emit('finished');
};

var progressBar = new ProgressBar({
  total: 100,
  size: 60,
  frequency: 100,
  bar: ' '
});

var c = 0;
var t = setInterval(function() {
  progressBar.tick();
  c++;
  if (c === 100) clearInterval(t);
}, 50);

