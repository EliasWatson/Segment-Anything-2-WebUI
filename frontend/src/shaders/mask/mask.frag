uniform sampler2D maskTexture;

varying vec2 vUv;

#define edgeDistance 0.005
#define edgeSteps 2
#define edgeAngleSteps 8

void main() {
    float mask = texture(maskTexture, vUv).r;

    float edgeValue = mask;
    for (int i = 0; i < edgeAngleSteps; ++i) {
        float angle = (float(i) / float(edgeAngleSteps)) * 3.1415 * 2.0;
        vec2 dir = vec2(cos(angle), sin(angle));

        for (int j = 0; j < edgeSteps; ++j) {
            float dist = (float(j + 1) / float(edgeSteps)) * edgeDistance;
            edgeValue = min(edgeValue, texture(maskTexture, vUv + dir * dist).r);
        }
    }

    vec4 insideColor = vec4(1.0, 1.0, 1.0, 0.25);
    vec4 edgeColor = vec4(1.0, 1.0, 1.0, 0.5);

    gl_FragColor = mix(edgeColor, insideColor, edgeValue) * vec4(1.0, 1.0, 1.0, mask);
}
