
export class MouseActiveTracker {

    private active: boolean = false;
    private inactiveTimeout: number | undefined;

    constructor(domElement: HTMLElement, private onStatusChange: (isActive: boolean) => void, private timeoutLengthMS: number = 500){
        domElement.addEventListener('mousemove', this.onMouseMove);
    }

    onMouseMove = () => {
        if(this.inactiveTimeout){
            window.clearTimeout(this.inactiveTimeout);
        }

        this.setStatus(true);

        this.inactiveTimeout = window.setTimeout(
            () => {
                this.setStatus(false);
            },
            this.timeoutLengthMS
        );
    };

    private setStatus = (value: boolean) => {
        if(this.active !== value){
            this.active = value;
            this.onStatusChange(value);
        }
    };
}