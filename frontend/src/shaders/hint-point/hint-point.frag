varying vec2 vUv;

void main() {
    float dist = length(vUv * 2.0 - 1.0);
    float mask = 1.0 - smoothstep(0.9, 1.0, dist);
    gl_FragColor = vec4(1.0, 0.0, 0.0, mask);
}
