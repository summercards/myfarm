/*  scrpits/farming/PlantingValidator.ts
 *  Cast downward and validate: only PlantingSurface is plantable.
 *  Returns: ok, snapped position, normal, reason (english).
 */
import { Vec3, geometry, PhysicsSystem, Mat4, Collider, Node, Quat } from 'cc';
import { PlantingSurface } from './PlantingSurface';

const UP = new Vec3(0, 1, 0);
const RAY = new geometry.Ray();
const TMP_POS = new Vec3();
const TMP_MAT = new Mat4();

export type PlantCheck = {
    ok: boolean;
    pos: Vec3;
    normal: Vec3;
    surface?: PlantingSurface | null;
    reason?: string;
};

export class PlantingValidator {
    static testAt(worldPos: Vec3, downLength: number = 5, seedTag?: string): PlantCheck {
        // Cast from 2m above, downwards; ignore triggers
        RAY.o.set(worldPos.x, worldPos.y + 2.0, worldPos.z);
        RAY.d.set(0, -1, 0);
        const hit = PhysicsSystem.instance.raycastClosest(RAY, 0xffffffff, 2.0 + downLength, false);
        if (!hit) return { ok: false, pos: worldPos.clone(), normal: UP.clone(), reason: 'No collider hit' };

        const res = PhysicsSystem.instance.raycastClosestResult!;
        const hitPos = res.hitPoint as Vec3;
        const hitNormal = res.hitNormal as Vec3;
        const collider = res.collider as Collider;

        const surface = this._findSurface(collider ? collider.node : null);
        if (!surface || !surface.plantable) {
            return { ok: false, pos: hitPos.clone(), normal: hitNormal.clone(), surface, reason: 'Surface is not marked plantable' };
        }

        // Slope check
        const dot = Vec3.dot(hitNormal, UP);
        const slopeDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
        if (slopeDeg > surface.maxSlopeDeg) {
            return { ok: false, pos: hitPos.clone(), normal: hitNormal.clone(), surface, reason: `Slope too steep (${slopeDeg.toFixed(1)}бу)` };
        }

        // Area limit (convert hitPos to surface local)
        if (surface.limitToArea) {
            Mat4.invert(TMP_MAT, surface.node.worldMatrix);
            Vec3.transformMat4(TMP_POS, hitPos, TMP_MAT);
            const halfX = surface.areaSize.x * 0.5;
            const halfZ = surface.areaSize.z * 0.5;
            if (Math.abs(TMP_POS.x) > halfX || Math.abs(TMP_POS.z) > halfZ) {
                return { ok: false, pos: hitPos.clone(), normal: hitNormal.clone(), surface, reason: 'Outside plantable area' };
            }
        }

        // Tag filter (use indexOf to support older TS targets)
        if (seedTag && surface.allowTags && surface.allowTags.length > 0) {
            if (surface.allowTags.indexOf(seedTag) === -1) {
                return { ok: false, pos: hitPos.clone(), normal: hitNormal.clone(), surface, reason: `Crop type not allowed: ${seedTag}` };
            }
        }

        // Final snapped position (lift along normal)
        const snapped = new Vec3(
            hitPos.x + hitNormal.x * surface.surfaceYOffset,
            hitPos.y + hitNormal.y * surface.surfaceYOffset,
            hitPos.z + hitNormal.z * surface.surfaceYOffset
        );

        return { ok: true, pos: snapped, normal: hitNormal.clone(), surface };
    }

    private static _findSurface(n: Node | null): PlantingSurface | null {
        let p: Node | null = n;
        while (p) {
            const s = p.getComponent(PlantingSurface);
            if (s) return s;
            p = p.parent;
        }
        return null;
    }

    static alignUpToNormal(outRot: Quat, normal: Vec3, preferForward = new Vec3(0, 0, 1)) {
        Quat.fromViewUp(outRot, preferForward, normal);
    }
}
