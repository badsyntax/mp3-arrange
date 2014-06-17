'use strict';

var EventEmitter = require('events').EventEmitter;

function pad(char, val) {
  return (char + val).slice(-char.length);
}

function formatTime(ms) {
  var seconds = ms / 1000;
  var remainingHours = Math.floor(seconds / 3600);
  seconds %= 3600;
  var remainingMinutes = Math.floor(seconds / 60);
  var remainingSeconds = Math.floor(seconds % 60);
  return [
    pad('00', remainingHours) + 'h ',
    pad('00', remainingMinutes) + 'm ',
    pad('00', remainingSeconds) + 's'
  ].join('');
}

var defaultOpts = {
  total: 0,
  size: 50,
  frequency: 100, // ms
  bgDefault: 'white',
  bgSuccess: 'green',
  tpl: [
    'Processing: {bar} {position} {percent}',
    'Elapsed: {elapsed} - Remaining: {remaining}'
  ].join('\n')
};

var ProgressBar = module.exports = function(opts) {

  EventEmitter.call(this);

  // Set default options
  for(var k in defaultOpts) {
    if (opts[k] === undefined)
      opts[k] = defaultOpts[k];
  }
  this.opts = opts;

  this.current = 0;
  this.startTime = 0;
  this.curTime = 0;
  this.endTime = 0;
  this.avgTime = 0;
  this.remaining = '';
  this.elapsed = '';

  this.charm = require('charm')();
  this.charm.pipe(process.stdout);

  this.charm.on('^C', function onExit() {
    this.charm.display('reset');
    process.exit();
  });
}

ProgressBar.prototype = Object.create(EventEmitter.prototype);

ProgressBar.prototype.progress = function(current) {

  if (!this.startTime) this.start();

  // Increment position
  if (current) this.current = current;
  else this.current++;

  // Finished
  if (this.current >= this.opts.total) return this.finish();

  // Check frequency
  if ((Date.now() - this.curTime) < this.opts.frequency) return;

  this.avgTime += (Date.now() - (this.curTime || Date.now()));
  this.curTime = Date.now();

  if (!this.remaining) this.setRemaining();
  if (!this.elapsed) this.setElapsed();

  this.output();
};

ProgressBar.prototype.start = function() {
  this.startTime = Date.now();
  this.emit('start');
  this.interval = setInterval(function() {
    this.setRemaining();
    this.setElapsed();
  }.bind(this), 1000);
};

ProgressBar.prototype.finish = function() {
  this.output(true); // ensure the bar is full
  clearInterval(this.interval);
  this.charm.end();
  this.emit('finish');
};

ProgressBar.prototype.output = function(end) {
  var lines = this.opts.tpl.split('\n');
  lines.forEach(this.outputLine.bind(this));
  if (!end) this.charm.up(lines.length);
};

ProgressBar.prototype.outputLine = function(tpl, i) {

  var length = 0;
  var sections = tpl.split(/(\{.*?\})/g).filter(function(v) {
    return v.length !== 0;
  });

  sections.forEach(function(val) {
    switch(val) {
      case '{bar}':
        length += this.opts.size;
        this.outputBar();
      break;
      case '{percent}':
        var str = this.getPercent();
        length += str.length;
        this.charm.write(str);
      break;
      case '{position}':
        var str = this.getPosition();
        length += str.length;
        this.charm.write(str);
      break;
      case '{elapsed}':
        length += this.elapsed.length;
        this.charm.write(this.elapsed);
      break;
      case '{remaining}':
        length += this.remaining.length;
        this.charm.write(this.remaining);
      break;
      default:
        this.charm.write(val);
        length += val.length;
      break;
    }
  }.bind(this));

  this.charm.left(length);
  this.charm.down(1);
};

ProgressBar.prototype.outputBar = function() {
  // Bar progress
  this.charm.foreground(this.opts.bgSuccess);
  this.charm.background(this.opts.bgSuccess);
  for (var i = 0; i < ((this.current / this.opts.total) * this.opts.size) - 1; i++) {
    this.charm.write(' ');
  }
  // Bar background
  this.charm.foreground(this.opts.bgDefault);
  this.charm.background(this.opts.bgDefault);
  while (i < this.opts.size - 1) {
    this.charm.write(' ');
    i++;
  }
  this.charm.display('reset');
}

ProgressBar.prototype.getPercent = function() {
  return pad('      ', ((this.current / this.opts.total) * 100).toFixed(2)) + '%';
};

ProgressBar.prototype.getPosition = function() {
  var totalLength = String(this.opts.total).length + 1;
  return pad(new Array(totalLength).join(' '), this.current) + '/' + this.opts.total;
};

ProgressBar.prototype.setElapsed = function() {
  this.elapsed = formatTime(Date.now() - this.startTime);
};

ProgressBar.prototype.setRemaining = function(s) {
  if (!this.avgTime) return '';
  // console.log('set remaining');
  var avgMs = Math.floor(this.avgTime / this.current);
  var ms = (avgMs * (this.opts.total - this.current)) + (Date.now() - this.curTime);
  this.remaining = formatTime(ms)
};

// var progressBar = new ProgressBar({
//   total: 1000,
//   size: 30,
//   frequency: 100,
// });

// progressBar.on('finish', function() {
//   console.log('Finished!1');
// });

// var c = 0;
// var t = setInterval(function() {
//   c++;
//   progressBar.progress();

//   if (c === 1000) clearInterval(t);
// }, 10);

