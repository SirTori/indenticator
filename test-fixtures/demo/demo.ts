class Foobar {
    constructor() {
        let iterations = Math.floor(Math.random() * 100);
        for(let i = 0; i < iterations; i++) {
            if(i % 3) {
                this.foo();
                /*
                Lorem ipsum dolor sit amet,
                consetetur sadipscing elitr,
                sed diam nonumy eirmod tempor
                invidunt ut labore et dolore
                magna aliquyam erat...
                */
            } else if(i % 2) {
                this.bar();
            }
        }
    }

    foo() {
        //do something
    }

    bar() {
        // do something else
    }
}