/*  scrpits/farming/PlantingSurface.ts
 *  Attach to ground (or its parent) to mark it as plantable.
 *  Optional limits: rectangle area, max slope, allowed crop tags.
 */
import { _decorator, Component, Vec3 } from 'cc';
const { ccclass, property, executeInEditMode, menu } = _decorator;

@ccclass('PlantingSurface')
@executeInEditMode(true)
@menu('Game/Farming/PlantingSurface (Plantable Ground)')
export class PlantingSurface extends Component {

    @property({ displayName: 'Plantable Enabled', tooltip: 'Enable to allow planting on this surface' })
    plantable: boolean = true;

    @property({ displayName: 'Limit To Rect Area', tooltip: 'Only allow planting within a local XZ rectangle of this node' })
    limitToArea: boolean = false;

    @property({
        displayName: 'Area Size XZ (meters)',
        tooltip: 'X = width, Z = length (effective only when Limit To Rect Area is enabled)',
        visible(this: PlantingSurface) { return this.limitToArea; }
    })
    areaSize: Vec3 = new Vec3(2, 0, 2);

    @property({ displayName: 'Max Slope (deg)', tooltip: 'Max angle between surface normal and world up (0,1,0)' })
    maxSlopeDeg: number = 20;

    @property({ displayName: 'Surface Y Offset (m)', tooltip: 'Lift crop along normal to avoid z-fighting' })
    surfaceYOffset: number = 0.02;

    @property({ type: [String], displayName: 'Allowed Crop Tags (optional)', tooltip: 'Fill itemId or tag; empty = no restriction' })
    allowTags: string[] = [];
}
