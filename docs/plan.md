# Minestronomy — Bedrock Runtime & Astronomy Rewrite Plan

**Baseline:** current `main` branch  
**Runtime reference:** working contents of `PACK/`  
**Primary goal:** rebuild Minestronomy around a Bedrock-compatible preview/runtime and a heliocentric, observer-centric astronomy engine.

---

# 1. Rewrite Strategy

The project should be rebuilt at the **subsystem level**, not thrown away wholesale.

Keep:

- the working `PACK` as a reference artifact
- proven star/cubemap generation
- useful astronomical datasets
- the Eel/Python application shell where it remains useful
- resource-pack export infrastructure where it can be reused
- any assets that have already been proven to work in Minecraft

Replace or substantially rewrite:

- the current Three.js celestial simulation
- Ptolemaic body calculations
- direct astronomy-to-Three.js transform logic
- the existing custom sky preview
- hardcoded Sun/Moon/Mars animation logic
- phase calculations embedded in particle JSON
- any system where preview rendering behavior is independently implemented from exported Bedrock JSON

The result should consist of three major systems:

```text
                    Minestronomy
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   Astronomy Engine   Bedrock Runtime   Editor
          │              │              │
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                Bedrock Resource Pack
```

The astronomy engine knows astronomy.

The Bedrock runtime knows Bedrock.

The editor orchestrates both.

No layer should impersonate another.

---

# 2. Core Architectural Locks

These should be treated as permanent constraints.

## LOCK 1 — `PACK/` Is the Runtime Reference

The currently working `PACK` is the reference for determining what Minecraft actually receives.

It is **not** the future source architecture.

The important distinction is:

```text
Current PACK
     ↓
behavior to reproduce
     ↓
new runtime
     ↓
new generated PACK
```

Do not take the current JSON organization as proof that the new system should preserve its structure.

---

## LOCK 2 — Preview Uses Bedrock Assets

The preview must be driven by the same:

- geometry JSON
- animation JSON
- animation-controller JSON
- Molang expressions
- textures/material assignments
- locators

that are exported to Minecraft.

The preview must not contain a separate astronomical rendering implementation.

This is the most important design lock in the project.

Bedrock animations manipulate skeleton channels for rotation, position, and scale, and animation controllers determine which animations are active.

Therefore:

```text
JSON
 ↓
Bedrock evaluator
 ↓
Preview
```

and:

```text
JSON
 ↓
Minecraft
```

must be the two consumers of the same asset representation.

---

## LOCK 3 — Astronomy Never Manipulates Three.js Objects

Astronomy produces astronomical state.

It does not call:

```text
object.rotation.x
object.position.y
bone.rotate(...)
```

or equivalent rendering operations.

Astronomy outputs angular state.

---

## LOCK 4 — Rendering Distance Is Not Astronomical Distance

Every celestial object may be rendered at approximately the same sky radius.

For example:

```text
Sun      → 250
Moon     → 250
Mars     → 250
Jupiter  → 250
Comet    → 250
```

The number is a Minecraft representation parameter.

It never represents physical distance.

---

## LOCK 5 — The Player Is the Observer

The system is ultimately based on:

```text
player
   ↓
Earth
   ↓
observer
```

The player never becomes a spacecraft.

No celestial rendering system should require the player to enter astronomical space.

---

## LOCK 6 — Heliocentric Internals, Observer-Centric Output

The authoring model is:

```text
Sun
 ├── Mercury
 ├── Venus
 ├── Earth
 ├── Mars
 └── ...
```

with:

```text
Earth
 └── Moon
```

But the final astronomical result is:

```text
what the observer sees
```

not:

```text
where Minecraft believes the planet physically exists
```

---

## LOCK 7 — The Bedrock Hierarchy Is Intentional

The new celestial geometry should target:

```text
player root
└── earth
    ├── moon
    └── sun
        ├── mercury
        ├── venus
        ├── mars
        ├── jupiter
        ├── saturn
        ├── uranus
        ├── neptune
        ├── comets
        └── other bodies
```

This hierarchy is used for angular composition and asset organization.

It does not imply physical Minecraft-space distances.

---

## LOCK 8 — Generated Child Rotations Are Relative

The astronomy engine may calculate:

```text
Moon apparent position
Sun apparent position
Mars apparent position
```

as observer-relative angular positions.

The generator then converts those into the rotations required by the chosen Bedrock hierarchy.

For example:

```text
Absolute apparent Mars angle
        -
Absolute apparent Sun angle
        =
Mars rotation relative to Sun
```

This lets the Bedrock hierarchy remain:

```text
earth
└── sun
    └── mars
```

without pretending Mars is physically orbiting a Minecraft-rendered Sun.

---

# 3. Phase 0 — Freeze the Working Pack

## Goal

Create an immutable baseline of the behavior that currently works in Minecraft.

## Inspect

Use only the sky-relevant portion of `PACK`:

```text
PACK/
├── models/entity/star.geo.json
├── animations/star.animation.json
├── animation_controllers/star_emitter.json
├── render_controllers/star.render_controller.json
├── particles/sun.particle.json
├── particles/moon.particle.json
└── entity/player.entity.json
```

The existing `star.geo.json` contains the current celestial hierarchy, while `star.animation.json` currently drives sky, Sun, and Moon rotations directly from Minecraft queries.

`player.entity.json` is also important because it actually attaches the star geometry, animation and particle controller to the player.

Do **not** spend this phase understanding unrelated:

```text
calendar
musical
horse
villager
player combat
```

content.

## Create

Create a small reference fixture containing only the files needed to reproduce the current sky.

For example:

```text
tests/
└── fixtures/
    └── bedrock_reference/
        ├── models/
        ├── animations/
        ├── animation_controllers/
        ├── render_controllers/
        └── particles/
```

The existing files remain untouched.

## Acceptance Gate

A fresh copy of the reference pack must still produce the same working sky in Minecraft.

Nothing architectural is changed yet.

### STOP condition

Do not begin rewriting astronomy until this reference is preserved.

---

# 4. Phase 1 — Define the Bedrock Compatibility Surface

## Goal

Decide exactly what portion of Bedrock the preview promises to emulate.

Do not attempt to emulate "Minecraft Bedrock" generically.

Build:

> "The Bedrock animation/runtime subset required by Minestronomy."

The current pack uses geometry bones, pivots, rotations, locators, animations, animation controllers, particle effects, and Molang expressions.

Bedrock resets the skeleton to its geometry-defined pose each frame and then applies animations per channel; X/Y/Z channels accumulate separately before the resulting transform is produced. Rotations default to degrees in X-then-Y-then-Z order.

Document these rules before implementing them.

## Compatibility specification

Define:

```text
Geometry
    bones
    parent
    pivot
    rotation
    cubes
    locators

Animation
    rotation
    position
    scale
    static values
    keyframes
    looping
    animation_length
    anim_time_update
    blend_weight
    override_previous_animation

Controllers
    states
    initial_state
    transitions
    animations
    controller nesting where required

Molang
    query
    variable
    temp
    this
    arithmetic
    comparisons
    ternary
    boolean operators
    math functions
```

## Acceptance Gate

Produce a written compatibility matrix:

```text
FEATURE                         SUPPORTED
geometry bones                 YES
bone parenting                 YES
pivot                          YES
rotation                       YES
position                       YES
scale                          YES
locators                       YES
keyframes                      YES
controllers                    YES
Molang arithmetic              YES
Molang query subset            YES
particle simulation            LIMITED/REQUIRED
...
```

Nothing unsupported should silently be approximated.

---

# 5. Phase 2 — Build the Bedrock Geometry Runtime

## Goal

Rebuild the preview's skeleton system from scratch.

Do not include astronomy.

Do not include the editor yet.

Load:

```text
star.geo.json
```

and construct an internal skeleton.

Conceptually:

```text
BedrockGeometry
    └── Bone[]
         ├── name
         ├── parent
         ├── pivot
         ├── baseRotation
         ├── cubes
         └── locators
```

Bedrock geometry bones are explicitly hierarchical and referenced by animation through their names.

## Runtime responsibilities

The geometry runtime must correctly reproduce:

```text
bone hierarchy
parent-relative transforms
pivot handling
base rotation
cube placement
locator placement
```

Three.js should exist underneath this runtime.

It must not define the semantics.

## Test fixture

Create an intentionally simple geometry:

```text
root
└── child
    └── grandchild
```

with visible colored cubes and locators.

Use extreme rotations:

```text
root:      90° X
child:    45° Y
grandchild: -30° Z
```

and non-zero pivots.

## Acceptance Gate

The preview must correctly reproduce the expected Bedrock skeleton before any animation is added.

---

# 6. Phase 3 — Build the Bedrock Transform Evaluator

This is the phase I would treat as the first serious technical milestone.

## Goal

Make Three.js obey Bedrock semantics rather than the other way around.

Implement a transform representation such as:

```text
BedrockTransform
{
    position
    rotation
    scale
}
```

but keep evaluation separate from Three.js.

The evaluator should determine:

```text
geometry pose
        +
animation contributions
        ↓
final Bedrock transform
        ↓
Three.js representation
```

Bedrock's documented animation pipeline resets the default pose each frame and then applies animation channels additively in order.

## Build a transform test suite

Test:

```text
base rotation
rotation X
rotation Y
rotation Z
combined rotation
parent rotation
parent position
child pivot
nested pivots
negative angles
360° wrap
multiple animations
```

Do not test astronomical formulas yet.

## Critical test

Create a model where every axis is visually distinguishable.

For example:

```text
X axis → red cube
Y axis → green cube
Z axis → blue cube
```

Then rotate the bone separately around each axis.

This is how you catch the classic:

```text
"looks right in Three.js but wrong in Minecraft"
```

problem early.

---

# 7. Phase 4 — Build a Molang Runtime

## Goal

Stop translating Molang manually.

The preview should execute the Molang expressions stored in the JSON.

Molang is central to Bedrock animation and can appear directly inside animation channels and controller conditions.

## Start with the actual fixture

Implement only expressions demonstrated by the current pack.

Required categories include:

```text
numbers
arithmetic
parentheses

+
-
*
/
%

comparisons
==
!=
<
>
<=
>=

!
&&
||

ternary

math.sin
math.cos
math.floor
math.mod
math.abs
math.pow
math.sqrt
math.clamp
math.lerp
math.inverse_lerp
```

Then:

```text
query.*
variable.*
v.*
t.*
this
```

Do not attempt to reproduce every Molang feature on day one.

Build it from the fixtures outward.

## Important

Do not use JavaScript `eval()` as the permanent implementation.

Build:

```text
lexer
→ parser
→ AST
→ evaluator
```

so the preview can control scope and emulate Bedrock semantics deliberately.

## Acceptance Gate

The preview can evaluate the expressions from `star.animation.json` and produce numeric results independently of Three.js.

---

# 8. Phase 5 — Build the Animation Runtime

## Goal

Evaluate animation JSON exactly as animation data.

Support:

```text
static rotation
keyframed rotation
position
scale
animation_length
loop
anim_time_update
blend_weight
override_previous_animation
```

Bedrock animation channels use timeline keyframes and Molang, and the engine tracks rotation, position, and scale independently.

## Animation pipeline

```text
default geometry pose
        ↓
animation 1
        ↓
animation 2
        ↓
...
        ↓
final pose
```

Channel accumulation must happen according to Bedrock behavior, rather than combining Three.js Euler rotations arbitrarily.

## Keyframe tests

Create tests for:

```text
single keyframe
two keyframes
multiple keyframes
loop boundary
animation time > length
animation time < 0
Molang-driven keyframes
multiple simultaneous animations
```

Current Bedrock documentation states that linear interpolation is the default/current keyframe behavior, with pre/post controls affecting interpolation.

Implement the supported interpolation behavior deliberately rather than relying on Three.js animation machinery.

---

# 9. Phase 6 — Build the Animation Controller Runtime

## Goal

Make:

```text
.animation_controllers.json
```

actually executable in the preview.

Controllers are state machines whose states can play animations and transition based on Molang.

Implement:

```text
initial_state
states
animations
transitions
transition conditions
state time
controller nesting where required
particle effect references
```

The current `star_emitter.json` is an excellent first controller fixture because it switches between:

```text
stars_only
constellations
```

and runs `sky_rotation` in both states.

It also spawns the Moon and Sun particles through locators.

## Acceptance Gate

The preview must load the existing controller and reproduce the existing star/constellation switching behavior.

---

# 10. Phase 7 — Import the Existing Sky Into the New Runtime

This is the first major checkpoint.

## Goal

The new preview loads the current sky assets directly.

Input:

```text
star.geo.json
star.animation.json
star_emitter.json
star.render_controller.json
sun.particle.json
moon.particle.json
```

The preview should display the current hierarchy:

```text
sky_anchor
└── latitude_anchor
    ├── bone_skybox
    │   └── axial_tilt
    ├── bone_sun_pivot
    │   └── bone_sun_declination
    │       └── bone_sun
    └── bone_moon_pivot
        └── bone_moon_declination
            └── bone_moon
```

That is what the existing working asset actually does.

## DO NOT

Do not modernize the hierarchy yet.

The sole purpose of this phase is:

> prove the Bedrock emulator against a real working Minestronomy asset.

## Acceptance Gate

For identical:

```text
day
time_of_day
latitude
player rotation
```

the preview must reproduce the current pack's pose.

At this point the preview has become useful independently of the new astronomy engine.

---

# 11. Phase 8 — Create Bedrock Runtime Debugging Tools

Before touching astronomy, add instrumentation.

The preview should be able to display:

```text
Bone
Parent
Position
Rotation X
Rotation Y
Rotation Z
Scale
Pivot
Locator positions
Active animations
Active controller state
Molang values
Animation time
```

Also allow:

```text
freeze frame
step one frame
set exact time
set query value
inspect expression
inspect evaluated expression
```

This is the equivalent of the debugging half of a small Blockbench.

## Critical feature

Selecting a bone should highlight its:

```text
pivot
local X axis
local Y axis
local Z axis
locators
parent
```

This will save enormous amounts of time when diagnosing Minecraft rotation mismatches.

---

# 12. Phase 9 — Replace the Celestial Geometry Hierarchy

Now rebuild the actual Minestronomy hierarchy.

Target:

```text
player root
└── earth
    ├── moon
    └── sun
        ├── mercury
        ├── venus
        ├── mars
        ├── jupiter
        ├── saturn
        ├── uranus
        ├── neptune
        ├── comets
        └── other bodies
```

Remove the old Ptolemaic concepts:

```text
deferent
epicycle
epicyclePeriod
deferentPeriod
deferentR
epicycleR
```

The hierarchy should describe the actual authored solar system.

## Earth

Earth is the observer reference.

It provides the root from which the visible sky is evaluated.

## Moon

Moon is Earth-relative.

## Sun

Sun is the heliocentric parent of the planetary system.

## Planets/comets

All solar-system bodies are children of the Sun.

The generated animations need to use relative angular rotations so this hierarchy produces the desired observer-relative sky positions.

---

# 13. Phase 10 — Build the Astronomy Engine From Scratch

This is where heliocentric modeling finally enters.

The engine should know nothing about:

```text
Three.js
Minecraft
bones
particles
cubes
locators
render distance
textures
```

## Input

```text
CelestialSystem
SimulationTime
ObserverState
```

## Output

Something conceptually equivalent to:

```text
CelestialAppearance
{
    body
    longitude
    latitude
    angularDiameter
    magnitude
    phase
    visibility
}
```

The exact schema can be finalized during the phase.

## Internal model

```text
System
├── star
└── planetary system
    ├── Mercury
    ├── Venus
    ├── Earth
    │   └── Moon
    ├── Mars
    └── ...
```

Use heliocentric orbital calculations for the editor and astronomical relationships.

Then resolve those states from Earth's observer.

---

# 14. Phase 11 — Observer and Sky Coordinates

The important change here is that the final astronomical result is **angular**.

Not:

```text
planetPosition = Vector3(...)
```

as the renderer's authoritative result.

Instead:

```text
planet
 ↓
heliocentric state
 ↓
Earth-relative apparent state
 ↓
observer-relative sky angles
```

The observer model should contain things such as:

```text
observer body = Earth
latitude
longitude
date
day
time_of_day
```

and eventually any system-specific orientation/precession parameters.

## Rendering conversion

Only after astronomy is finished:

```text
sky longitude
sky latitude
        ↓
direction
        ↓
fixed sky radius
```

The fixed radius exists solely to prevent Minecraft clipping or otherwise undesirable rendering behavior.

---

# 15. Phase 12 — Sky Orientation and Player Rotation

This phase handles the relationship between:

```text
Earth
player
Minecraft camera
sky
```

This is where the current:

```text
sky_anchor
query.body_y_rotation
latitude_anchor
```

behavior gets replaced.

The new system must establish one unambiguous convention for:

```text
north
south
east
west
zenith
nadir
```

and then map it to Bedrock's actual rotation semantics.

Do not "eyeball" this.

Create a test scene containing:

```text
North marker
East marker
South marker
West marker
Zenith marker
```

Then verify the result in Minecraft.

## Acceptance Gate

Rotating the Minecraft player/camera must cause the preview sky to behave exactly as the real pack does.

---

# 16. Phase 13 — Generate Bedrock Animation From Astronomy

Now connect the two systems.

The flow becomes:

```text
Astronomy Engine
        ↓
apparent angular state
        ↓
relative hierarchy angles
        ↓
Molang / animation generator
        ↓
animation.json
        ↓
Bedrock Runtime
        ↓
Preview
```

The preview does **not** receive the astronomy result directly.

It receives the generated Bedrock assets.

This is crucial.

For example:

```text
Astronomy:
    Mars = 152.3°
    Sun  = 137.1°

Generator:
    Mars relative to Sun = 15.2°

Generated Bedrock:
    mars rotation = 15.2°
```

The runtime then evaluates the JSON normally.

---

# 17. Phase 14 — Fixed Rendering Distance

Implement the Minecraft representation layer.

The astronomy engine does not know:

```text
250 blocks
80 blocks
40 blocks
```

The representation layer does.

For particle-based bodies:

```text
locator
    ↓
particle local-space offset
```

For the current pack, both Sun and Moon particles are emitted at a fixed `[0, 250, 0]` local-space offset. That is exactly the kind of implementation detail that belongs to the Bedrock representation layer rather than the astronomy engine.

The resulting design becomes:

```text
Celestial angular state
        ↓
Bedrock bone rotation
        ↓
locator
        ↓
fixed-radius particle
```

---

# 18. Phase 15 — Rebuild the Moon Model

The existing Moon particle calculates phase using independent scalar lunar/solar longitude formulas inside the particle JSON.

That should be removed.

Moon phase belongs to astronomy.

Calculate the phase from the actual relative geometry of:

```text
Sun
Moon
Earth/observer
```

Then expose the resulting phase to the appearance system.

The renderer should receive something like:

```text
phase = new_moon
phase = waxing_crescent
phase = first_quarter
...
```

or a continuous phase parameter.

The eight-frame sprite atlas then becomes merely a representation.

---

# 19. Phase 16 — Eclipse Engine

Eclipses should also move completely out of Molang.

The astronomy engine determines:

```text
Sun apparent direction
Moon apparent direction
Sun angular radius
Moon angular radius
angular separation
```

Then determines whether the apparent disks overlap.

This is an angular problem.

The renderer does not need to discover whether an eclipse is happening.

It receives the result.

Potential output:

```text
solarEclipse:
    active
    magnitude
    coverage
    type

lunarEclipse:
    active
    magnitude
    coverage
```

The first implementation should be purely geometric.

No n-body simulation is required.

---

# 20. Phase 17 — Rebuild Planet and Comet Authoring

Now the editor gets its real astronomical body system.

Each body should have concepts such as:

```text
name
type
parent
orbital parameters
rotation parameters
appearance
texture
magnitude
angular size
```

The parent relationship becomes:

```text
Earth
 └── Moon

Sun
 ├── Mercury
 ├── Venus
 ├── Earth
 ├── Mars
 └── ...
```

The editor should never ask the user to understand:

```text
deferents
epicycles
Ptolemaic deferent radius
```

Those are legacy concepts.

---

# 21. Phase 18 — Build the Lite Blockbench Editor

Only after the runtime is reliable should the editor interface be heavily rebuilt.

The editor should have three major views.

## A. Bedrock Model View

```text
Bones
├── earth
├── moon
├── sun
│   ├── mercury
│   ├── venus
│   ├── mars
│   └── ...
```

Selecting a bone shows:

```text
pivot
rotation
position
scale
parent
locators
cubes
```

## B. Animation View

Timeline:

```text
0s ─────── 1s ─────── 2s ─────── 3s
          ●             ●
          keyframe      keyframe
```

Properties:

```text
rotation
position
scale
Molang
interpolation
loop
```

## C. Astronomy View

```text
System
Bodies
Orbit
Observer
Time
Events
Appearance
```

These three views operate on the same underlying project.

---

# 22. Phase 19 — Import Existing Bedrock Assets

The finished editor must be able to do:

```text
Import geometry.json
Import animation.json
Import animation_controllers.json
Import textures
        ↓
Preview
```

This is one of the most important user-facing goals.

It means an existing Bedrock animation can be inspected even before it is generated by Minestronomy.

That is what makes the tool genuinely useful as a lightweight Bedrock authoring/debugging environment rather than a bespoke astronomy viewer.

---

# 23. Phase 20 — Appearance System

Separate astronomical appearance from Minecraft representation.

## Astronomy

```text
physical radius
luminosity
albedo
distance
phase
```

produces:

```text
apparent magnitude
angular diameter
illumination
color
```

## Representation

Then:

```text
apparent magnitude
angular diameter
        ↓
Minecraft billboard size
Minecraft tint
Minecraft texture
Minecraft particle type
```

This permits:

```text
Sun → ordinary Sun texture
Sun → black hole texture
Mars → custom texture
Moon → phase atlas
Comet → custom sprite
```

without contaminating the astronomical model.

---

# 24. Phase 21 — Rebuild the Star System

Once celestial bodies are correct, rebuild the starfield around the same principle.

The starfield should be:

```text
astronomical star data
        ↓
observer-relative directions
        ↓
sky representation
```

The cubemap itself remains a representation mechanism.

The original project's cubemap seam/pole problem should therefore be treated as a **projection problem**, not an astronomy problem.

Constellation geometry/textures should be optional overlays on the same sky orientation.

---

# 25. Phase 22 — Time System

Remove arbitrary astronomy constants from rendering.

Things currently embedded in the working pack include values such as:

```text
365
365.25
23.5
29.53
```

These should not remain scattered throughout generated animation logic.

The system should define its temporal model centrally.

For example:

```text
system year length
system day length
epoch
calendar model
```

The astronomy layer converts simulation time into whatever orbital phase is required.

The Bedrock layer only receives expressions generated from that model.

---

# 26. Phase 23 — Export Pipeline

The final export pipeline becomes:

```text
Project
  │
  ├── Astronomy
  ├── Geometry
  ├── Animations
  ├── Controllers
  ├── Textures
  └── Appearance
         ↓
     Generator
         ↓
   Resource Pack
```

Generate only the files actually required by the authored system.

Do not make the old bloated `PACK` directory the template for every export.

The existing `PACK` contains unrelated experiments; the final exporter should produce a clean dependency-resolved resource pack.

---

# 27. Phase 24 — Minecraft/Preview Differential Testing

This phase is mandatory.

The preview cannot be declared "Bedrock compatible" merely because the equations appear correct.

Create a test matrix.

## Rotation tests

```text
0°
90°
180°
270°
-90°
compound XYZ
parent + child
```

## Observer tests

```text
latitude -90
latitude -45
latitude 0
latitude +45
latitude +90
```

## Time tests

```text
midnight
sunrise
noon
sunset
```

## Annual tests

```text
day 0
equinox 1
solstice 1
equinox 2
solstice 2
year boundary
```

## Lunar tests

```text
new moon
quarter
full moon
quarter
```

## Planet tests

```text
inferior conjunction
superior conjunction
opposition
maximum elongation
```

At exact test states:

```text
Preview screenshot
        vs
Minecraft screenshot
```

The debug panel should also expose the actual evaluated bone transforms so disagreements can be diagnosed numerically instead of by guessing.

---

# 28. Phase 25 — Golden Bedrock Test Scenes

Create permanent tiny Bedrock fixtures.

Examples:

### Scene A — Rotation

```text
root
└── child
```

with obvious colored axis geometry.

### Scene B — Parenting

```text
root
└── child
    └── grandchild
```

with exaggerated transforms.

### Scene C — Keyframes

One cube moving through known positions.

### Scene D — Molang

A cube driven by:

```text
math.sin(query.time_of_day * 360)
```

### Scene E — Controller

A controller switching between two obviously different poses.

### Scene F — Celestial

```text
Earth
├── Moon
└── Sun
    ├── Mars
    └── Jupiter
```

These should become permanent regression tests.

---

# 29. Phase 26 — Remove the Ptolemaic System

Only after the new system passes its gates.

Remove:

```text
ptolemyBodies
computePlanetSkyPosition
computeSunWorldPosition
computeMoonWorldPosition
deferent
epicycle
epicyclePeriod
deferentPeriod
```

and their UI.

Do not leave compatibility shims everywhere simply because the old system existed.

The old system becomes history.

---

# 30. Phase 27 — Remove Direct Astronomy From Rendering

Audit the project for patterns such as:

```javascript
if (body === "sun")
if (body === "moon")
rotation = astronomicalCalculation(...)
```

inside rendering code.

Replace them with:

```text
Astronomy Engine
        ↓
generated Bedrock assets
        ↓
Bedrock Runtime
```

The renderer should be capable of displaying something astronomical without knowing what that thing is.

---

# 31. Phase 28 — Final Architecture

The intended system should ultimately look approximately like this:

```text
                         MINESTRONOMY
                              │
             ┌────────────────┴────────────────┐
             │                                 │
             ▼                                 ▼
      ASTRONOMY SYSTEM                  BEDROCK SYSTEM
             │                                 │
      Celestial System                    Asset Loader
             │                                 │
      Orbital Models                     Geometry Runtime
             │                                 │
      Ephemeris Engine                   Molang Runtime
             │                                 │
      Observer Model                     Animation Runtime
             │                                 │
      Appearance Model                   Controller Runtime
             │                                 │
             └──────────────┐       ┌──────────┘
                            ▼       ▼
                         PROJECT
                            │
                            ▼
                          EDITOR
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
          Astronomy       Bedrock       Preview
          authoring       authoring     runtime
                            │
                            ▼
                      Resource Pack
```

And the astronomical data flow:

```text
Heliocentric System
        ↓
Orbital State
        ↓
Earth-relative State
        ↓
Observer-relative Angular State
        ↓
Appearance State
        ↓
Bedrock Animation Generation
        ↓
Bedrock Runtime
        ↓
Minecraft Sky
```

The rendering data flow:

```text
Geometry JSON
Animation JSON
Controller JSON
Molang
Textures
        ↓
Bedrock Runtime Emulator
        ↓
Three.js
```

The preview therefore never has to understand:

> "This is Mars."

It only understands:

> "`mars` is a bone, and this is the transform Bedrock evaluated for it."

That is the architectural separation I would aim for.

---

# 32. Recommended Phase Order

The order matters.

```text
P0   Freeze working PACK
P1   Define Bedrock compatibility
P2   Geometry runtime
P3   Transform evaluator
P4   Molang runtime
P5   Animation runtime
P6   Controller runtime
P7   Import current PACK
P8   Runtime debugging tools

       ← BEDROCK SIDE COMPLETE →

P9   New celestial hierarchy
P10  Astronomy engine
P11  Observer/angular coordinates
P12  Player/sky orientation
P13  Astronomy → Bedrock animation generator
P14  Fixed rendering distance
P15  Moon phase
P16  Eclipse engine
P17  Planet/comet authoring
P18  Lite Blockbench editor
P19  Bedrock asset import
P20  Appearance system
P21  Star system
P22  Time system
P23  Export pipeline
P24  Differential testing
P25  Golden test scenes
P26  Remove Ptolemy
P27  Remove direct astronomy/render coupling
P28  Final architecture cleanup
```

The critical strategic decision is the split after Phase 8.

**Do not build the new astronomical system until the Bedrock runtime is trustworthy.**

Otherwise we would have two unknowns at the same time:

```text
"Is the astronomy wrong?"
+
"Is the preview interpreting Bedrock wrong?"
```

That would recreate the exact debugging mess the current project has.

---

# 33. AI-Assisted Development Protocol

Since you plan to use both ChatGPT and Claude, each phase should have a strict contract.

Give both models:

```text
1. Phase specification
2. Phase acceptance criteria
3. Relevant files only
4. Previous phase output
5. Current test failures
```

Do **not** give either model the entire repository unless a phase genuinely requires it.

For each phase:

```text
PHASE START
    ↓
Ask both models for architectural/code assessment
    ↓
Compare disagreements
    ↓
Choose implementation
    ↓
Implement
    ↓
Run phase tests
    ↓
Minecraft verification when required
    ↓
PHASE LOCK
    ↓
Next phase
```

The models should be used differently:

**One model challenges the design.**

**One model challenges the implementation.**

Do not accept an implementation simply because both models independently produced similar code.

The acceptance tests are the authority.

---

# 34. Phase Completion Rule

Every phase should end with four things:

```text
IMPLEMENTED
TESTED
VERIFIED
LOCKED
```

For example:

```text
Phase 3
[✓] Transform evaluator implemented
[✓] Unit tests passing
[✓] Bedrock fixture verified
[✓] Preview verified
[✓] Minecraft comparison complete
[LOCKED]
```

A later phase is allowed to discover that an earlier phase is wrong.

When that happens:

```text
current phase
    ↓
identify previous-phase defect
    ↓
reopen previous phase
    ↓
fix
    ↓
rerun downstream gates
```

Do not stack known-invalid systems on top of one another.

---

# 35. Definition of Done

Minestronomy is architecturally complete when all of these are true:

```text
[ ] Preview can import real Bedrock geometry JSON
[ ] Preview reproduces Bedrock bone hierarchy
[ ] Preview reproduces Bedrock transforms
[ ] Preview evaluates required Molang
[ ] Preview evaluates animation JSON
[ ] Preview evaluates animation controllers
[ ] Preview supports locators
[ ] Preview supports the celestial runtime assets
[ ] Preview and Minecraft agree on rotations

[ ] Astronomy is heliocentric
[ ] Earth is the observer reference
[ ] Moon is Earth-relative
[ ] Planets/comets are Sun-relative
[ ] Final astronomical state is angular
[ ] Rendering distance is independent of astronomical distance
[ ] Moon phase derives from astronomical state
[ ] Eclipses derive from astronomical state
[ ] Planet motion derives from astronomical state
[ ] Star positions derive from astronomical state

[ ] Editor can author the celestial system
[ ] Editor can inspect Bedrock bones
[ ] Editor can inspect animations
[ ] Editor can inspect controllers
[ ] Editor can inspect Molang
[ ] Editor can import geometry
[ ] Editor can import animation
[ ] Editor can preview exact assets
[ ] Editor can export the resource pack

[ ] Ptolemaic implementation removed
[ ] Direct astronomy/Three.js coupling removed
[ ] Unnecessary legacy PACK content removed from generated output
[ ] Regression fixtures established
[ ] Minecraft/preview differential tests established
```

The final system should feel less like the current custom astronomy demo with a pack exporter attached, and more like:

> **a Bedrock-compatible animation/model workbench with an astronomy engine plugged into it.**

That is the direction I would take.

:::end-writing

The main architectural choice I would make **now** is therefore: **rewrite the preview/runtime first, rather than trying to rehabilitate the current `celestial.js`; preserve the current `PACK` as the golden behavioral reference.** The current Bedrock documentation supports the runtime assumptions above, particularly the hierarchical bone model, channel-based animation, additive application, and X-then-Y-then-Z rotation behavior.

For the next implementation cycle, Phase 0–3 are the part I would keep especially strict: once the preview can correctly load a deliberately tiny geometry and reproduce Bedrock's rotations/pivots/parenting, the rest of the project has a much safer foundation.