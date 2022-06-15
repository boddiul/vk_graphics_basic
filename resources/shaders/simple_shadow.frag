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

layout (binding = 1) uniform sampler2D shadowMap;

// http://steps3d.narod.ru/tutorials/skin-tutorial.html

const float gamma         = 1.2;
const float FDiel         = 0.04;       // Fresnel for dielectrics
const float pi            = 3.141592;


float phongExponent ( float glossiness )
{
    return (1.0/pow(1.0 - glossiness, 3.5) - 1.0);
}

vec3 Fresnel ( in vec3 f0, in float product )
{
    return mix ( f0, vec3 (1.0), pow(1.0 - product, 5.0) );
}

float Fresnel ( in float f0, in float product )
{
    return mix ( f0, 1.0, pow(1.0 - product, 5.0) );
}

    // Kelem-Szirmay-Kalos visibility
float   KelemVis ( in float nl, in float nv, in float a )
{
    return 1.0 / ((nl*(1.0-a) + a)*nv*(1.0-a) + a);
}

float  D_Phong ( in float nh, in float n )
{
    return (n+2.0) * pow ( max ( 0, nh ), n ) / (2.0 * pi);
}


void main()
{
  const vec4 posLightClipSpace = Params.lightMatrix*vec4(surf.wPos, 1.0f); // 
  const vec3 posLightSpaceNDC  = posLightClipSpace.xyz/posLightClipSpace.w;    // for orto matrix, we don't need perspective division, you can remove it if you want; this is general case;
  const vec2 shadowTexCoord    = posLightSpaceNDC.xy*0.5f + vec2(0.5f, 0.5f);  // just shift coords from [-1,1] to [0,1]               
    
  const bool  outOfView = (shadowTexCoord.x < 0.0001f || shadowTexCoord.x > 0.9999f || shadowTexCoord.y < 0.0091f || shadowTexCoord.y > 0.9999f);
  const float shadow    = ((posLightSpaceNDC.z < textureLod(shadowMap, shadowTexCoord, 0).x + 0.001f) || outOfView) ? 1.0f : 0.0f;

  const vec4 dark_violet = vec4(0.59f, 0.0f, 0.82f, 1.0f);
  const vec4 chartreuse  = vec4(0.5f, 1.0f, 0.0f, 1.0f);

  vec4 resColor0 = mix(dark_violet, chartreuse, abs(sin(Params.time)));
    
  vec3 lightDir   = normalize(Params.lightPos - surf.wPos);

  vec3 h = normalize(1.0 + surf.wNorm);

  vec3 bump = vec3(1.0);
  
  float spec = 0.6;
  //float spec = surf.wPos.x<0 ? 0.1 : 0.6;

  vec3    n        = normalize(2.0 * (bump - vec3 ( 0.5 )));
  vec4    clr      = pow ( resColor0, vec4 ( gamma ) );
  vec4    diff     = clr * max ( dot ( n, lightDir ), 0.1 );
  float   nh       = max ( dot ( n, h ), 0.0 );
  float   nl       = max ( dot ( n, lightDir ), 0.0 );
  float   nv       = max ( dot ( n, surf.wNorm ), 0.0 );
  float   f         = Fresnel ( FDiel, clamp( dot ( h, surf.wNorm ), 0.0, 1.0 ) );
  float   phongExp1 = pow ( 2.0, 14.0 * spec );
  float   phongExp2 = phongExp1 * phongExp1;
  float   spec1    = D_Phong ( nh, phongExp1 ) * f * KelemVis ( nl, nv, spec ) * nl;
  float   spec2    = D_Phong ( nh, phongExp2 ) * f * KelemVis ( nl, nv, spec ) * nl;

  vec4 resColor1 = vec4 ( diff.rgb, 1.0 );  
  vec4 resColor2 =  (0.85*spec1 + 0.15*spec2) * vec4 ( 1.0 );


  out_fragColor = resColor1;

  out_fragColor.rgb += resColor2.rgb;
  out_fragColor.rgb = pow ( out_fragColor.rgb, vec3 ( 1.0 / gamma ) );  
  


  vec4 lightColor2 = vec4(1.0f, 1.0f, 1.0f, 1.0f);
   
  out_fragColor = max(dot(surf.wNorm, lightDir), 0.0f) * out_fragColor;

  // out_fragColor = out_fragColor * shadow;


}
