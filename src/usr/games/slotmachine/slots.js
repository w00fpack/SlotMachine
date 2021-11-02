/**

https://www.svgrepo.com/collection/casino-10/
*/

var FPS = 60;
setInterval(function() {
	logic();
	render();
}, 1000/FPS);

// html elements
var can;		 // canvas
var ctx;		 // context
var log_p;	 // log paragraph
var cred_p;	// credits paragraph

var symbols_loaded = false;
var wheels_bg_loaded = false;

// art
var symbols = new Image();
var wheels_bg = new Image();
var snd_wheel_stop = new Array();
var snd_win;
highlight_color = "green";

symbols.src = "images/icons.png";
wheels_bg.src = "images/wheels_bg.png";

snd_win = new Audio("sounds/win.wav");
snd_wheel_stop[0] = new Audio("sounds/wheel_stop.wav");
snd_wheel_stop[1] = new Audio("sounds/wheel_stop.wav");
snd_wheel_stop[2] = new Audio("sounds/wheel_stop.wav");

// enums
var STATE_REST = 0;
var STATE_SPINUP = 1;
var STATE_SPINDOWN = 2;
var STATE_REWARD = 3;

// config
var wheel_count = 3;
var symbol_count = 11;
var wheel_positions = wheel_count * symbol_count - 1;
var symbol_size = 50;
var row_count = 3;
var stopping_distance = 50;
var max_wheel_speed = 5;
var spin_acceleration = 50;
var spin_deceleration = 50;
var starting_credits = 100;
var reward_delay = 5; // how many frames between each credit tick
var reward_delay_grand = 1; // delay for grand-prize winning
var reward_grand_threshhold = 25; // count faster if the reward is over this size

var symbol_payout = new Array(symbol_count);
symbol_payout[7] = 4; // gem red
symbol_payout[6] = 6; // gem yellow
symbol_payout[5] = 8; // gem grey
symbol_payout[1] = 10; // diamond blue
symbol_payout[2] = 15; // diamond grey
symbol_payout[3] = 20; // diamond green
symbol_payout[4] = 25; // orange
symbol_payout[0] = 50; // cherry
symbol_payout[8] = 75; // grape
symbol_payout[9] = 100; // wild
symbol_payout[10] = 250; // clover

var payout_ups = 6; // Any 3 diamonds
var payout_downs = 2; // Any 3 gems

var wheels_left = 30;
var wheels_top = 90;
var wheels_width =150;
var wheels_height =150;

// set up wheels
var wheels = new Array(wheel_count);
wheels[0] = new Array(2,1,7,1,2,7,6,7,3,10,1,6,1,7,3,4,3,2,4,5,0,6,10,5,6,5,8,3,0,9,5,4);
wheels[1] = new Array(6,0,10,3,6,7,9,2,5,2,3,1,5,2,1,10,4,5,8,4,7,6,0,1,7,6,3,1,5,9,7,4);
wheels[2] = new Array(1,4,2,7,5,6,4,10,7,5,2,0,6,4,10,1,7,6,3,0,5,7,2,3,9,3,5,6,1,8,1,3);

var wheel_pixel_length = wheel_positions * symbol_size;

var wheel_position = new Array(wheel_count);
for (var i=0; i<wheel_count; i++) {
	wheel_position[i] = Math.floor(Math.random() * wheel_positions) * symbol_size;
}

var stopping_position = new Array(wheel_count);
var start_slowing = new Array(wheel_count);

// wheel spin speed in pixels per frame
var wheel_speed = new Array(wheel_count);
for (var i=0; i<wheel_count; i++) {
	wheel_speed[i] = 0;
}

var result = new Array(wheel_count);
for (var i=0; i<wheel_count; i++) {
	result[i] = new Array(row_count);
}

var game_state = STATE_REST;
var credits = starting_credits;
var payout = 0;
var reward_delay_counter = 0;
var playing_lines = 1;

//---- Render Functions ---------------------------------------------

function draw_symbol(symbol_index, x, y) {
	var symbol_pixel = symbol_index * symbol_size;
	ctx.drawImage(
		symbols,
		0,
		symbol_pixel,
		symbol_size,
		symbol_size,
		 x+wheels_left,
		y+wheels_top,
		symbol_size,
		symbol_size
	);
}

function wheelDraw() {
	// clear wheel
	 ctx.drawImage(wheels_bg, wheels_left, wheels_top);

	// set clipping area
	ctx.beginPath();
	ctx.rect(wheels_left, wheels_top, wheels_width, wheels_height);
	ctx.clip();

	var wheel_index;
	var symbol_offset;
	var symbol_index;
	var x;
	var y;

	for (var i=0; i<wheel_count; i++) {
		for (var j=0; j<row_count +1; j++) {

			wheel_index = Math.floor(wheel_position[i] / symbol_size) + j;
			symbol_offset = wheel_position[i] % symbol_size;

			// wheel wrap
			if (wheel_index >= wheel_positions) wheel_index -= wheel_positions;

			// symbol lookup
			symbol_index = wheels[i][wheel_index];

			x = i * symbol_size;
			y = j * symbol_size - symbol_offset;

			draw_symbol(symbol_index, x, y);

		}
	}
}

function highlight_line(line_num) {

	ctx.fillStyle = highlight_color;
	ctx.globalAlpha = 0.2;
	var ss = symbol_size;

	// top row
	if (line_num == 2 || line_num == 4) {
		ctx.fillRect(wheels_left, wheels_top, symbol_size-2, symbol_size-2); // top left
	}
	if (line_num == 2) {
		ctx.fillRect(wheels_left + ss, wheels_top, ss-2, ss-2); // top middle
	}
	if (line_num == 2 || line_num == 5) {
		ctx.fillRect(wheels_left + ss + ss, wheels_top, ss-2, ss-2); // top right
	}

	// middle row
	if (line_num == 1) {
		ctx.fillRect(wheels_left, wheels_top + ss, ss-2, ss-2); // top left
	}
	if (line_num == 1 || line_num == 4 || line_num == 5) {
		ctx.fillRect(wheels_left + ss, wheels_top + ss, ss-2, ss-2); // top middle
	}
	if (line_num == 1) {
		ctx.fillRect(wheels_left + ss + ss, wheels_top + ss, ss-2, ss-2); // top right
	}

	// bottom row
	if (line_num == 3 || line_num == 5) {
		ctx.fillRect(wheels_left, wheels_top + ss + ss, ss-2, ss-2); // top left
	}
	if (line_num == 3) {
		ctx.fillRect(wheels_left + ss, wheels_top + ss + ss, ss-2, ss-2); // top middle
	}
	if (line_num == 3 || line_num == 4) {
		ctx.fillRect(wheels_left + ss + ss, wheels_top + ss + ss, ss-2, ss-2); // top right
	}

	ctx.globalAlpha = 1.0;
}

// render all art needed in the current frame
function render() {

	if (game_state == STATE_SPINUP || game_state == STATE_SPINDOWN) {
		wheelDraw();
	}

}


//---- Logic Functions ---------------------------------------------

function set_stops() {
	for (var i=0; i<wheel_count; i++) {

		start_slowing[i] = false;

		stop_index = Math.floor(Math.random() * wheel_positions);
		stopping_position[i] = stop_index * symbol_size;

		stopping_position[i] += stopping_distance;
		if (stopping_position[i] >= wheel_pixel_length) stopping_position[i] -= wheel_pixel_length;

		// convenient here to remember the winning positions
		for (var j=0; j<row_count; j++) {
			result[i][j] = stop_index + j;
			if (result[i][j] >= wheel_positions) result[i][j] -= wheel_positions;

			// translate wheel positions into symbol
			result[i][j] = wheels[i][result[i][j]];
		}
	}
}

function wheelSpin(i) {
	wheel_position[i] -= wheel_speed[i];

	// wrap
	if (wheel_position[i] < 0) {
		wheel_position[i] += wheel_pixel_length;
	}
}

// handle wheels accelerating to full speed
function wheelSpinAccelerate() {

	for (var i=0; i<wheel_count; i++) {

		// move wheel at current speed
		wheelSpin(i);

		// accelerate speed
		wheel_speed[i] += spin_acceleration;

	}

	// if wheel at max speed, begin spindown
	if (wheel_speed[0] >= max_wheel_speed) {

		// calculate the final results now, so that spindown is ready
		set_stops();

		game_state = STATE_SPINDOWN;
	}
}

// handle wheel movement as the wheels are coming to rest
function wheelSpinDecelerate() {
	// if wheels finished moving, begin rewards
	if (wheel_speed[wheel_count-1] <= 0) {

		document.getElementById('bb').classList.remove('spin');

		calc_reward();
		game_state = STATE_REWARD;
	}

	for (var i=0; i<wheel_count; i++) {

		// move wheel at current speed
		wheelSpin(i);

		// start slowing this wheel?
		if (start_slowing[i] == false) {

			// if the first wheel, or the previous wheel is already slowing
			var check_position = false;
			if (i == 0) check_position = true;
			else if (start_slowing[i-1]) check_position = true;

			if (check_position) {

				if (wheel_position[i] == stopping_position[i]) {
					start_slowing[i] = true;
				}
			}
		}
		else {
			if (wheel_speed[i] > 0) {
				wheel_speed[i] -= spin_deceleration;

				if (wheel_speed[i] == 0) {
					try {
						snd_wheel_stop[i].currentTime = 0;
						snd_wheel_stop[i].play();
					} catch(err) {};
				}

			}
		}
	}

}

// count up the reward credits, play sound effects, etc.
function logic_reward() {
	if (payout == 0) {
		game_state = STATE_REST;
		return;
	}

	// don't tick up rewards each frame, too fast
	if (reward_delay_counter > 0) {
		reward_delay_counter--;
		return;
	}

	payout--;
	credits++;
	cred_p.innerHTML = "" + credits + "";

	if (payout < reward_grand_threshhold) {
		reward_delay_counter = reward_delay;
	}
	else { // speed up big rewards
		reward_delay_counter += reward_delay_grand;
	}

}

// update all logic in the current frame
function logic() {

	// REST to SPINUP happens on an input event

	if (game_state == STATE_SPINUP) {
		wheelSpinAccelerate();
	}
	else if (game_state == STATE_SPINDOWN) {
		wheelSpinDecelerate();
	}
	else if (game_state == STATE_REWARD) {
		logic_reward();
	}

}

// given an input line of symbols, determine the payout
function calc_line(s1, s2, s3) {

	// perfect match
	if (s1 == s2 && s2 == s3) {
		return symbol_payout[s1];
	}

	// special case #1: triple ups
	if ((s1 == 1 || s1 == 2 || s1 == 3) &&
			(s2 == 1 || s2 == 2 || s2 == 3) &&
			(s3 == 1 || s3 == 2 || s3 == 3)) {
		return payout_ups;
	}

	// special case #2: triple down
	if ((s1 == 5 || s1 == 6 || s1 == 7) &&
			(s2 == 5 || s2 == 6 || s2 == 7) &&
			(s3 == 5 || s3 == 6 || s3 == 7)) {
		return payout_downs;
	}

	// special case #3: bacon goes with everything
	if (s1 == 9) {
		if (s2 == s3) return symbol_payout[s2];

		// wildcard trip ups
		if ((s2 == 1 || s2 == 2 || s2 == 3) &&
				(s3 == 1 || s3 == 2 || s3 == 3)) return payout_ups;

		// wildcard trip downs
		if ((s2 == 5 || s2 == 6 || s2 == 7) &&
				(s3 == 5 || s3 == 6 || s3 == 7)) return payout_downs;

	}
	if (s2 == 9) {
		if (s1 == s3) return symbol_payout[s1];

		// wildcard trip ups
		if ((s1 == 1 || s1 == 2 || s1 == 3) &&
				(s3 == 1 || s3 == 2 || s3 == 3)) return payout_ups;

		// wildcard trip downs
		if ((s1 == 5 || s1 == 6 || s1 == 7) &&
				(s3 == 5 || s3 == 6 || s3 == 7)) return payout_downs;

	}
	if (s3 == 9) {
		if (s1 == s2) return symbol_payout[s1];

		// wildcard trip ups
		if ((s1 == 1 || s1 == 2 || s1 == 3) &&
				(s2 == 1 || s2 == 2 || s2 == 3)) return payout_ups;

		// wildcard trip downs
		if ((s1 == 5 || s1 == 6 || s1 == 7) &&
				(s2 == 5 || s2 == 6 || s2 == 7)) return payout_downs;
	}

	// check double-bacon
	if (s2 == 9 && s3 == 9) return symbol_payout[s1];
	if (s1 == 9 && s3 == 9) return symbol_payout[s2];
	if (s1 == 9 && s2 == 9) return symbol_payout[s3];

	// no reward
	return 0;
}

// calculate the reward
function calc_reward() {
	payout = 0;
	win = []

	var partial_payout;

		// Line 5
		partial_payout = calc_line(result[0][2], result[1][1], result[2][0]);
		payout_this = '';
		if (partial_payout > 0) {
		 payout_this = partial_payout;
			payout += partial_payout;
			highlight_line(5);
		}
		win.push(payout_this);

	if (playing_lines > 1) {

		// Line 2
		partial_payout = calc_line(result[0][0], result[1][0], result[2][0]);
		payout_this = '';
		if (partial_payout > 0) {
		payout_this = partial_payout;
			payout += partial_payout;
			highlight_line(2);
		}
		win.push(payout_this);
}

	// Line 1
	partial_payout = calc_line(result[0][1], result[1][1], result[2][1]);
	payout_this = '';
	if (partial_payout > 0) {
	 payout_this = partial_payout;
		payout += partial_payout;
		highlight_line(1);
	}
		win.push(payout_this);


	if (playing_lines > 1) {
		// Line 3
		partial_payout = calc_line(result[0][2], result[1][2], result[2][2]);
		payout_this = ''
		if (partial_payout > 0) {
		 payout_this = partial_payout;
			payout += partial_payout;
			highlight_line(3);
		}
		win.push(payout_this);
	}


	if (playing_lines > 3) {

		// Line 4
		partial_payout = calc_line(result[0][0], result[1][1], result[2][2]);
		payout_this = '';
		if (partial_payout > 0) {
		 payout_this = partial_payout;
			payout += partial_payout;
			highlight_line(4);
		}
		 win.push(payout_this);
 }

	for (xa = 0; xa < 5; xa++)
	{
		aa = (win[xa] == '' || win[xa] == undefined) ? '0' : win[xa];
		 log_p.innerHTML += aa + "<br />\n";
	}


	if (payout > 0) {
		try {
			snd_win.currentTime = 0;
			snd_win.play();
		}
		catch(err) {};
	}

}

//---- Input Functions ---------------------------------------------

function highlightButton(object)
{
	for (x=0; x < document.getElementsByTagName('BUTTON').length; x++)
	{
		this_button = document.getElementsByTagName('BUTTON')[x];
		this_button.classList.remove('button_on');
	}
	object.classList.add('button_on');
}

function handleKey(evt) {
	if (evt.keyCode == 32) { // spacebar
	spin();
	}
}

function spin() {

	if (game_state != STATE_REST) return;

		if (playing_lines == 5 && credits < 5)
		{
		playing_lines = 3;
	}
		if (playing_lines == 3 && credits < 3)
		{
		playing_lines = 1;
	}

	highlightButton(document.getElementById('button_' + playing_lines));

	if (credits < playing_lines) return;

	credits -= playing_lines;

	cred_p.innerHTML = "" + credits + "";
	log_p.innerHTML = "";

	document.getElementById('bb').classList.add('spin');

	game_state = STATE_SPINUP;

}

//---- Init Functions -----------------------------------------------

function init() {
	can = document.getElementById("slots");
	ctx = can.getContext("2d");
	log_p = document.getElementById("log");
	cred_p = document.getElementById("total");

	cred_p.innerHTML = "" + credits + ""

	window.addEventListener('keydown', handleKey, true);

	symbols.onload = function() {
		symbols_loaded = true;
		if (symbols_loaded && wheels_bg_loaded) wheelDraw();
	};

	wheels_bg.onload = function() {
		wheels_bg_loaded = true;
		if (symbols_loaded && wheels_bg_loaded) wheelDraw();
	};

}


