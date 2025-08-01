export async function measureTime(callback){
    const start = performance.now();
    const result = await callback();
    const end = performance.now();
    console.log(`Time taken: ${end - start}ms`);
    return result;
}

export async function measureTimeWithTimeOutput(callback){
    const start = performance.now();
    const result = await callback();
    const end = performance.now();
    return {
        result,
        time: end - start
    };
}

export class FunctionTimer {
    constructor(callback){
        this.callback = callback;
        this.durations = [];
    }

    async run(){
        const start = performance.now();
        const result = await this.callback();
        const end = performance.now();
        this.durations.push(end - start);
        return result;
    }

    getAverage(){
        return this.durations.reduce((a, b) => a + b, 0) / this.durations.length;
    }
}

export class DataArray {
    constructor(){
        this.data = [];
    }

    add(data){
        this.data.push(data);
    }

    getAverage(){
        return this.data.reduce((a, b) => a + b, 0) / this.data.length;
    }

}

export class Debugger {
    constructor(recording_enabled){
        this.recording_enabled = recording_enabled;
        this.data = {};
        this._measureIntervalPrevTime = {};
    }

    async measureTime(key, callback){
        if(!this.recording_enabled) return;
        const { result, time } = await measureTimeWithTimeOutput(callback);
        console.log(key, result, time);
        if(!this.data[key]){
            this.data[key] = [];
        }
        this.data[key].push(time);
        return result;
    }
    measureInterval(key){
        if(!this.recording_enabled) return;
        if(!this.data[key]){
            this.data[key] = [];
        }
        if(this._measureIntervalPrevTime[key]){
            this.data[key].push(performance.now() - this._measureIntervalPrevTime[key]);
        }
        this._measureIntervalPrevTime[key] = performance.now();
    }
    addData(key, data){
        if(!this.recording_enabled) return;
        if(!this.data[key]){
            this.data[key] = [];
        }
        this.data[key].push(data);
    }
    setData(key, data){
        if(!this.recording_enabled) return;
        this.data[key] = data;
    }
    getData(key){
        return this.data[key];
    }
    increment(key){
        if(!this.recording_enabled) return;
        if(!this.data[key]){
            this.data[key] = 0;
        }
        this.data[key]++;
    }

    copyToClipboard(key){
        navigator.clipboard.writeText(JSON.stringify(this.data[key]));
    }
    copyToClipboardAll(){
        navigator.clipboard.writeText(JSON.stringify(this.data));
    }
}