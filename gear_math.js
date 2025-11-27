/**
 * GearMath - Pure math functions for gear phase calculations
 *
 * This module provides testable, side-effect-free functions for calculating
 * gear phase offsets and verifying mesh alignment.
 */
var GearMath = {
    /**
     * Calculate the phase offset for a child gear meshing with a parent gear.
     *
     * @param {number} parentPhase - Parent gear's phase offset (radians)
     * @param {number} meshAngle - Angle from parent center to child center (radians)
     * @param {number} parentTeeth - Number of teeth on parent gear
     * @param {number} childTeeth - Number of teeth on child gear
     * @returns {number} Phase offset for child gear, normalized to [0, 2π)
     */
    calculateChildPhase: function(parentPhase, meshAngle, parentTeeth, childTeeth) {
        var ratio = parentTeeth / childTeeth;
        var halfTooth = Math.PI / childTeeth;

        // Derived from mesh condition: parent tooth meets child gap at contact point.
        // tooth_phase(angle) = (angle + rotation) * teeth; phase=0 means tooth, phase=π means gap
        var offset = halfTooth - Math.PI - meshAngle * (1 + ratio) - parentPhase * ratio;

        // Normalize to [0, 2π)
        offset = offset % (2 * Math.PI);
        if (offset < 0) offset += 2 * Math.PI;

        return offset;
    },

    /**
     * Get all tooth angle positions for a gear at a given rotation.
     *
     * @param {number} numTeeth - Number of teeth on the gear
     * @param {number} rotation - Current rotation of the gear (radians)
     * @returns {number[]} Array of angles where teeth are located
     */
    toothAngles: function(numTeeth, rotation) {
        var angles = [];
        var spacing = 2 * Math.PI / numTeeth;
        for (var i = 0; i < numTeeth; i++) {
            var angle = (rotation + i * spacing) % (2 * Math.PI);
            if (angle < 0) angle += 2 * Math.PI;
            angles.push(angle);
        }
        return angles;
    },

    /**
     * Get all gap (valley) angle positions for a gear at a given rotation.
     * Gaps are located halfway between teeth.
     *
     * @param {number} numTeeth - Number of teeth on the gear
     * @param {number} rotation - Current rotation of the gear (radians)
     * @returns {number[]} Array of angles where gaps are located
     */
    gapAngles: function(numTeeth, rotation) {
        var halfTooth = Math.PI / numTeeth;
        var angles = [];
        var spacing = 2 * Math.PI / numTeeth;
        for (var i = 0; i < numTeeth; i++) {
            var angle = (rotation + halfTooth + i * spacing) % (2 * Math.PI);
            if (angle < 0) angle += 2 * Math.PI;
            angles.push(angle);
        }
        return angles;
    },

    /**
     * Find the angular distance from a target angle to the nearest tooth.
     *
     * @param {number} targetAngle - The angle to check (radians)
     * @param {number} numTeeth - Number of teeth on the gear
     * @param {number} rotation - Current rotation of the gear (radians)
     * @returns {number} Angular distance to nearest tooth (always positive)
     */
    distanceToNearestTooth: function(targetAngle, numTeeth, rotation) {
        var spacing = 2 * Math.PI / numTeeth;
        var minDist = Infinity;
        for (var i = 0; i < numTeeth; i++) {
            var toothAngle = (rotation + i * spacing) % (2 * Math.PI);
            if (toothAngle < 0) toothAngle += 2 * Math.PI;
            var diff = Math.abs(targetAngle - toothAngle);
            diff = Math.min(diff, 2 * Math.PI - diff); // Handle wraparound
            if (diff < minDist) minDist = diff;
        }
        return minDist;
    },

    /**
     * Find the angular distance from a target angle to the nearest gap.
     *
     * @param {number} targetAngle - The angle to check (radians)
     * @param {number} numTeeth - Number of teeth on the gear
     * @param {number} rotation - Current rotation of the gear (radians)
     * @returns {number} Angular distance to nearest gap (always positive)
     */
    distanceToNearestGap: function(targetAngle, numTeeth, rotation) {
        var halfTooth = Math.PI / numTeeth;
        var spacing = 2 * Math.PI / numTeeth;
        var minDist = Infinity;
        for (var i = 0; i < numTeeth; i++) {
            var gapAngle = (rotation + halfTooth + i * spacing) % (2 * Math.PI);
            if (gapAngle < 0) gapAngle += 2 * Math.PI;
            var diff = Math.abs(targetAngle - gapAngle);
            diff = Math.min(diff, 2 * Math.PI - diff);
            if (diff < minDist) minDist = diff;
        }
        return minDist;
    },

    /**
     * Check if a target angle is near a tooth (within tolerance).
     *
     * @param {number} targetAngle - The angle to check (radians)
     * @param {number} numTeeth - Number of teeth on the gear
     * @param {number} rotation - Current rotation of the gear (radians)
     * @param {number} [tolerance=0.01] - Maximum angular distance to consider "near"
     * @returns {boolean} True if a tooth is within tolerance of the target angle
     */
    isNearTooth: function(targetAngle, numTeeth, rotation, tolerance) {
        tolerance = tolerance || 0.01;
        return this.distanceToNearestTooth(targetAngle, numTeeth, rotation) < tolerance;
    },

    /**
     * Check if a target angle is near a gap (within tolerance).
     *
     * @param {number} targetAngle - The angle to check (radians)
     * @param {number} numTeeth - Number of teeth on the gear
     * @param {number} rotation - Current rotation of the gear (radians)
     * @param {number} [tolerance=0.01] - Maximum angular distance to consider "near"
     * @returns {boolean} True if a gap is within tolerance of the target angle
     */
    isNearGap: function(targetAngle, numTeeth, rotation, tolerance) {
        tolerance = tolerance || 0.01;
        return this.distanceToNearestGap(targetAngle, numTeeth, rotation) < tolerance;
    },

    /**
     * Verify that two gears are properly meshed at a given mesh point.
     *
     * For proper meshing, teeth must interleave: when one gear has a tooth
     * closer to the mesh point, the other should have a gap closer.
     * This is a qualitative check that doesn't require exact alignment.
     *
     * @param {number} parentTeeth - Number of teeth on parent gear
     * @param {number} childTeeth - Number of teeth on child gear
     * @param {number} meshAngle - Angle from parent center to child center (radians)
     * @param {number} parentRotation - Current rotation of parent gear (radians)
     * @param {number} childRotation - Current rotation of child gear (radians)
     * @param {number} [tolerance] - Unused, kept for API compatibility
     * @returns {boolean} True if gears are properly meshed
     */
    verifyMeshAlignment: function(parentTeeth, childTeeth, meshAngle, parentRotation, childRotation, tolerance) {
        var childMeshAngle = (meshAngle + Math.PI) % (2 * Math.PI);

        // Get distances to nearest tooth/gap at mesh points
        var parentToothDist = this.distanceToNearestTooth(meshAngle, parentTeeth, parentRotation);
        var parentGapDist = this.distanceToNearestGap(meshAngle, parentTeeth, parentRotation);
        var childToothDist = this.distanceToNearestTooth(childMeshAngle, childTeeth, childRotation);
        var childGapDist = this.distanceToNearestGap(childMeshAngle, childTeeth, childRotation);

        // For proper interleaving:
        // - If parent has tooth closer to mesh, child should have gap closer
        // - If parent has gap closer to mesh, child should have tooth closer
        //
        // Use a small epsilon for comparison to handle floating-point edge cases
        // where tooth and gap are nearly equidistant from the mesh point.
        var epsilon = 0.001;

        var parentHasToothCloser = parentToothDist < parentGapDist - epsilon;
        var parentHasGapCloser = parentGapDist < parentToothDist - epsilon;
        var childHasToothCloser = childToothDist < childGapDist - epsilon;
        var childHasGapCloser = childGapDist < childToothDist - epsilon;

        // When distances are nearly equal (within epsilon), either configuration works
        var parentNeutral = !parentHasToothCloser && !parentHasGapCloser;
        var childNeutral = !childHasToothCloser && !childHasGapCloser;

        // Valid mesh: (parent tooth meets child gap) OR (parent gap meets child tooth)
        // OR either/both are neutral (equidistant)
        if (parentNeutral || childNeutral) {
            return true; // Equidistant case - mesh is acceptable
        }
        return (parentHasToothCloser && childHasGapCloser) || (parentHasGapCloser && childHasToothCloser);
    },

    /**
     * Get detailed alignment info for debugging.
     *
     * @param {number} parentTeeth - Number of teeth on parent gear
     * @param {number} childTeeth - Number of teeth on child gear
     * @param {number} meshAngle - Angle from parent center to child center (radians)
     * @param {number} parentRotation - Current rotation of parent gear (radians)
     * @param {number} childRotation - Current rotation of child gear (radians)
     * @returns {object} Detailed alignment information
     */
    getAlignmentInfo: function(parentTeeth, childTeeth, meshAngle, parentRotation, childRotation) {
        var childMeshAngle = (meshAngle + Math.PI) % (2 * Math.PI);
        var halfToothParent = Math.PI / parentTeeth;
        var halfToothChild = Math.PI / childTeeth;

        return {
            meshAngle: meshAngle,
            childMeshAngle: childMeshAngle,
            parent: {
                teeth: parentTeeth,
                rotation: parentRotation,
                toothDist: this.distanceToNearestTooth(meshAngle, parentTeeth, parentRotation),
                gapDist: this.distanceToNearestGap(meshAngle, parentTeeth, parentRotation),
                halfTooth: halfToothParent
            },
            child: {
                teeth: childTeeth,
                rotation: childRotation,
                toothDist: this.distanceToNearestTooth(childMeshAngle, childTeeth, childRotation),
                gapDist: this.distanceToNearestGap(childMeshAngle, childTeeth, childRotation),
                halfTooth: halfToothChild
            }
        };
    }
};

// Export for Node.js testing (if running in Node)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GearMath;
}
