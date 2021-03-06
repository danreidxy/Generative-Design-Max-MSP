autowatch = 1;
include('m4x.mouseinfo');

var { m4x } = require('m4x');
var mg;
var m4;
var outputmatrix;
var width;
var height;
var col = 'black';

setup();

function setup() {
	width = 640;
	height = 480;
	// jit.mgraphics
	mg = new JitterObject('jit.mgraphics', width, height);
	// the matrix to store and display jit.mgraphics's output
	outputmatrix = new JitterMatrix(4, 'char', width, height);

	m4 = new m4x();
	m4.color_mode('HSB', 360, 100, 100, 100);

	background(1, 1, 1, 1);
	col = m4.color(0, 0, 0, 10);
}

function draw() {
	if (mousedown) {
		mg.save(); // push matrix();
		var vertices = [];
		mg.translate(width / 2, height / 2);
		var circle_resolution = Math.floor(m4.map(mousey + 100, 0, height, 2, 10));
		var radius = mousex - width / 2 + 0.5;
		var angle = (Math.PI * 2) / circle_resolution;

		var c;
		switch (col) {
			case 'blue':
				c = m4.color(192, 100, 64, 10);
				break;
			case 'gold':
				c = m4.color(52, 100, 71, 10);
				break;
			default:
				c = m4.color(0, 0, 0, 10);
		}

		mg.set_source_rgba(c);

		for (var i = 0; i <= circle_resolution; i++) {
			var x = Math.cos(angle * i) * radius;
			var y = Math.sin(angle * i) * radius;
			vertices[i] = m4.create_vector(x, y);
		}

		for (var i = 0; i < vertices.length - 1; i++) {
			mg.move_to(vertices[i].x, vertices[i].y);
			mg.line_to(vertices[i + 1].x, vertices[i + 1].y);
			mg.stroke();
		}
		mg.restore(); // pop matrix();
	}
	// this should always be last in the draw function
	mg.matrixcalc(outputmatrix, outputmatrix);
	outlet(0, 'jit_matrix', outputmatrix.name);
}

function clear() {
	background(1, 1, 1, 1);
}

function set_color(v) {
	if (v === 0) col = 'black';
	else if (v === 1) col = 'blue';
	else if (v === 2) col = 'gold';
}

function background(r, g, b, a) {
	mg.set_source_rgba(r, g, b, a);
	mg.paint();
	mg.set_source_rgba(0, 0, 0, 1); // default stroke/ fill color
	mg.identity_matrix();
	mg.move_to(0, 0);
	mg.matrixcalc(outputmatrix, outputmatrix);
}
