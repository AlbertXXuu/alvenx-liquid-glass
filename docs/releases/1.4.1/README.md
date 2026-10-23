# 1.4.1 — Local surface response

The homepage entrance previously used a small translation and uniform scale for
hover/press. Holding it did not retain a drag: moving away returned it to rest,
unlike the large form's localized response. The owner requested bounded pulling
and release, with stronger proximity response and independent lobes.

`VolumeBuddingLink` now applies a smooth local deformation around the primary
pointer, resamples the visible contour into the same C2 family, and feeds that
exact path to the material profile, native clip and contact shadow. Pulling has
a soft displacement limit and a damped return. Re-grabbing retains the displayed
pull and velocity. Both closed and expanded mothers respond; detached lobes stay
independent. Native text remains readable.

A drag beyond 6 CSS pixels consumes that activation. Ordinary mother clicks
still toggle, ordinary chamber clicks navigate, keyboard activation remains
available, and cancellation/blur releases ownership. Touch gestures beginning
on the form belong to the form; background gestures can scroll. Reduced motion
keeps the material static. Settled rendering sleeps.

The accepted resting/growth geometry, light palette, shader, SSR first-frame
images and mobile shadow treatment are retained. Contract checks compare 202
resting/growth cases against R7, and check independent local deformation,
bounded pull and frame-step-independent spring settling. Existing clock,
normal-map, endpoint, packaging and startup checks remain applicable.

The source change does not update the `/ui/` showcase or historical review URLs.
Publication and online evidence are recorded separately after deployment.
Chromium viewport/CDP tests are not physical iPhone/iPad Safari or Combo Touch
acceptance. The completed development archive is indexed in
[the maintenance record](../../maintenance/archive-20261023/README.md).

Rights remain reserved / UNLICENSED. No npm publication.
