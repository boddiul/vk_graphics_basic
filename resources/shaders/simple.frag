#version 450
#extension GL_ARB_separate_shader_objects : enable
#extension GL_GOOGLE_include_directive : require

#include "common.h"

layout(location = 0) out vec4 out_fragColor;

layout (location = 0 ) in VS_OUT
{
    vec3 wPos;
    vec3 wNorm;
    vec3 wTangent;
    vec2 texCoord;
} surf;

layout(binding = 0, set = 0) uniform AppData
{
    UniformParams Params;
};



vec3 bright(vec3 color)
{
    return 1.0f - (1.0 - color)*(1.0 - color)*(1.0 - color);
}

vec3 grayscale(vec3 color)
{
    float col = 0.3 * color.x + 0.59 * color.y + 0.11 * color.z;

    return vec3(col,col,col);
}

vec3 black_white(vec3 color)
{
    float col = round(grayscale(color).x);

    return vec3(col,col,col);
}

vec3 invert(vec3 color)
{
    return 1.0f - color;
}

// Tonemapping from: https://64.github.io/tonemapping

vec3 reinhard(vec3 color)
{
    return color / (1.0f + color);
}

float luminance(vec3 v)
{
    return dot(v, vec3(0.2126f, 0.7152f, 0.0722f));
}

vec3 lerp(vec3 f, vec3 a, vec3 b)
{
    return a + f * (b - a);
}

vec3 reinhard_jodie(vec3 color)
{
    float l = luminance(color);
    vec3 tv = color / (1.0f + color);
    return lerp(color / (1.0f + l), tv, tv);
}

vec3 uncharted2_tonemap_partial(vec3 x)
{
    float A = 0.15f;
    float B = 0.50f;
    float C = 0.10f;
    float D = 0.20f;
    float E = 0.02f;
    float F = 0.30f;
    return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;
}

vec3 uncharted2_filmic(vec3 color)
{
    float exposure_bias = 2.0f;
    vec3 curr = uncharted2_tonemap_partial(color * exposure_bias);

    vec3 W = vec3(11.2f);
    vec3 white_scale = vec3(1.0f) / uncharted2_tonemap_partial(W);
    return curr * white_scale;
}

vec3 aces_approx(vec3 color)
{
    color *= 0.6f;
    float a = 2.51f;
    float b = 0.03f;
    float c = 2.43f;
    float d = 0.59f;
    float e = 0.14f;
    return clamp((color*(a*color+b))/(color*(c*color+d)+e), 0.0f, 1.0f);
}

void main()
{
    vec3 lightDir1 = normalize(Params.lightPos - surf.wPos);
    vec3 lightDir2 = vec3(0.0f, 0.0f, 1.0f);

    const vec4 dark_violet = vec4(0.59f, 0.0f, 0.82f, 1.0f);
    const vec4 chartreuse  = vec4(0.5f, 1.0f, 0.0f, 1.0f);

    vec4 lightColor1 = mix(dark_violet, chartreuse, 0.5f);
    if(Params.animateLightColor != 0)
        lightColor1 = mix(dark_violet, chartreuse, abs(sin(Params.time)));

    vec4 lightColor2 = vec4(1.0f, 1.0f, 1.0f, 1.0f);

    vec3 N = surf.wNorm; 

    vec4 color1 = max(dot(N, lightDir1), 0.0f) * lightColor1;
    vec4 color2 = max(dot(N, lightDir2), 0.0f) * lightColor2;
    vec4 color_lights = mix(color1, color2, 0.2f);

    vec4 res_color = color_lights * vec4(Params.baseColor, 1.0f);
    

    vec3 pre_color = res_color.xyz;

    if (Params.tm_type == 1)
        pre_color = reinhard(pre_color);

    else if (Params.tm_type == 2)
        pre_color = reinhard_jodie(pre_color);

    else if (Params.tm_type == 3)
        pre_color = uncharted2_filmic(pre_color);
        
    else if (Params.tm_type == 4)
        pre_color = aces_approx(pre_color);

        
    if (Params.post_bright != 0)
        pre_color = bright(pre_color);

    if (Params.post_grayscale != 0)
        pre_color = grayscale(pre_color);

    if (Params.post_black_white != 0)
        pre_color = black_white(pre_color);
        
    if (Params.post_invert != 0)
        pre_color = invert(pre_color);
       
    out_fragColor = vec4(pre_color,1.0);
}