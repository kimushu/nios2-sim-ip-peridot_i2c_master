import { Module } from "nios2-sim";
import { SimulatorOptions } from "nios2-sim/types/src/simulator";
import { Qsys } from "nios2-sim/types/src/qsys";
import { SopcInfoModule } from "nios2-sim/types/src/sopcinfo";
import { AvalonSlave } from "nios2-sim/types/src/interface";

export function getModuleConstructor(kind: string) {
    return PeridotI2CMasterModule;
}

class PeridotI2CMasterModule extends Module {
    public s1: AvalonSlave;
    
    private _rst: boolean = true;
    private _clkdiv: number;
    private _irqena: boolean;
    private _rdy: boolean;
    private _nack: boolean;
    private _rxdata: number;

    constructor(path: string, system: Qsys, options: SimulatorOptions) {
        super(path, system, options);
        this._writeReg(1, 0x8000);
    }

    load(moddesc: SopcInfoModule): Promise<void> {
        let i = moddesc.interface;
        this.s1 = <AvalonSlave>this.loadInterface(i.s1);
        this.s1.readReg = this._readReg.bind(this);
        this.s1.writeReg = this._writeReg.bind(this);
        return Module.prototype.load.call(this, moddesc);
    }

    private _readReg(offset: number): number {
        switch (offset) {
            case 0:
                return (
                    (this._irqena   ? 0x8000 : 0) |
                    (this._rdy      ? 0x0200 : 0) |
                    (this._nack     ? 0x0100 : 0) |
                    (this._rxdata   & 0x00ff)
                );
            case 1:
                return (
                    (this._rst      ? 0x8000 : 0) |
                    (this._clkdiv   & 0x03ff)
                );
        }
    }

    private _writeReg(offset: number, value: number): boolean {
        switch (offset) {
            case 0:
                if (!this._rst) {
                    this._irqena = !!(value & 0x8000);
                    this._nack = !!(value & 0x0100);
                    // FIXME
                }
                return true;
            case 1:
                this._rst = !!(value & 0x8000);
                if (!this._rst) {
                    this._clkdiv = (value & 0x03ff);
                    this._rdy = true;
                } else {
                    this._irqena = false;
                    this._rdy = false;
                    this._nack = false;
                    this._rxdata = 0;
                    this._clkdiv = 0;
                }
                return true;
        }
        return false;
    }
}
