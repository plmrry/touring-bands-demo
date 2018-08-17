import xs from "xstream";

export default function flattenParallel(n) {
  return function(input$$) {
    const pending = [];
    let active = 0;
    return xs.create({
      start: out => {
        function onNext(input$) {
          if (active > n) pending.push(input$);
          else {
            active++;
            input$.addListener({
              next: item => out.next(item),
              complete: () => {
                active--;
                if (pending.length > 0) onNext(pending.shift());
              }
            });
          }
        }
        input$$.addListener({
          next: onNext
        });
      },
      stop: () => {}
    });
  };
}
