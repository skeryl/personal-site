
precision mediump float;
uniform vec3 color;
varying vec3 vPosition;

uniform sampler2D uDataTexture;

out vec4 outColor;

void main() {
    // Calculate distance from the center of the pixel to the edges
    float distance = log(length(gl_PointCoord - vec2(vPosition.x, vPosition.y))) / 2.;
    // Create a simple radial gradient
    // float alpha = 1.0 - smoothstep(0.3, 0.5, distance);

    // Output the final color
    outColor = vec4(color, 1.0);
}

