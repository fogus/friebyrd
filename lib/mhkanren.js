(function(root) {
  var Bindings, F, LVar, conjunction, disjunction, find;

  function merge(dest) {
    var args = Array.prototype.slice.call(arguments, 1);
    args.forEach(function(obj) {
      var prop;
      for (prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          dest[prop] = obj[prop];
        }
      }
    });
    return dest;
  }

  function isEqual(x, y) {
    // primitive equality
    // object identity (reference)
    if (x === y) {
      return true;
    }
    // object method (for lvar)
    if (x.isEqual) {
      return x.isEqual(y);
    }
    // list
    if (pair(x) && pair(y)) {
      return eq(x, y);
    }
    return false;
  }
  root = this;
  
  F = {};
  // scheme in javascript ....
  var cons = F.cons = function(x, y) {
    var fn = function(pick) {
      return pick(x, y);
    };
    fn.toString = function() {
      return "(" + asArray(this).join(" ") + ")";
    };
    fn.pair = true;
    return fn;
  };
  var car = F.car = function(f) {
    return f(function(x, y) { return x; });
  };
  var cdr = F.cdr = function(f) {
    return f(function(x, y) { return y; });
  };
  var pair = F.pair = function(x) { return x && x.pair; };
  var list = F.list = function() {    
    var args = Array.prototype.slice.call(arguments);
    return (args.length === 0) ? null : cons(args.shift(), list.apply(null, args));
  };
  var append = F.append = function(l, m) {
    return (l === null) ? m : cons(car(l), append(cdr(l), m));
  };
  var map = F.map = function(lat, fn) { 
    return (lat === null) ? null : cons(fn(car(lat)), map(cdr(lat), fn)); 
  };
  var flatten = F.flatten = function(ls) {
    var head, tail;
    if (isEmpty(ls)) {
      return null;
    }
    head = car(ls);
    tail = cdr(ls);
    return pair(head) ? append(flatten(head), flatten(tail)) : cons(head, flatten(tail));
  };
  var eq = F.eq = function(ls1, ls2) {
    if (ls1 === null) {
      return ls2 === null;
    }
    if (ls2 === null) {
      return false;
    }
    return eq(car(ls1), car(ls2)) && eq(cdr(ls1), cdr(ls2));
  };
  var length = F.length = function(ls) {
    return (isEmpty(ls)) ? 0 : 1 + length(cdr(ls));
  };
  var isEmpty = F.isEmpty = function(ls) {
    return ls === null || car(ls) === null;
  };
  function asArray(list) {
    var arr = arguments[1] || [];
    return (list && car(list)) ? (arr.push(car(list)), asArray(cdr(list), arr)) : arr;
  }
  function asList(arr) {
    return list.apply(null, arr);
  }

  // end scheme section
 
  var succeed = F.succeed = function(result) {
    return list(result);
  };
  var fail = F.fail = function(result) {
    return null;
  };
  var disj = F.disj = function(l, r) {
    return function(x) {
      return append(l(x), r(x));
    };
  };
  var conj = F.conj = function(l, r) {
    return function(x) {
      return flatten(map(l(x), r));
    };
  };
  
  // prolog-like logic variables
  LVar = function LVar(name) {
    this.name = name;
  };
  LVar.prototype.isEqual = function(that) {
    return this.name === that.name;
  };
  var lvar = F.lvar = function(name) {
    return new LVar(name);
  };
  var isLvar = F.isLVar = function(v) {
    return v instanceof LVar;
  };
  find = function(v, bindings) {
    var lvar;

    lvar = bindings.lookup(v);
    if (isLVar(v)) {
      return lvar;
    }
    if (isPair(lvar)) {
      if (isEmpty(lvar)) {
        return lvar;
      } else {
        return cons(find(car(lvar), bindings), find(cdr(lvar), bindings));
      }
    }
    return lvar;
  };

  function Bindings(seed) {
    if (seed == null) {
      seed = {};
    }
    this.binds = merge({}, seed);
  }

  Bindings.prototype.extend = function(lvar, value) {
    var o = {};
    o[lvar.name] = value;
    return new Bindings(merge({}, this.binds, o));
  };

  Bindings.prototype.has = function(lvar) {
    return this.binds.hasOwnProperty(lvar.name);
  };

  Bindings.prototype.lookup = function(lvar) {
    if (!F.isLVar(lvar)) {
      return lvar;
    }
    if (this.has(lvar)) {
      return this.lookup(this.binds[lvar.name]);
    }
    return lvar;
  };


  var ignorance = F.ignorance = new Bindings();
  var unify = F.unify = function(l, r, bindings) {
    var t1, t2;

    t1 = bindings.lookup(l);
    t2 = bindings.lookup(r);
    if (isEqual(t1, t2)) {
      return bindings;
    }
    if (isLVar(t1)) {
      return bindings.extend(t1, t2);
    }
    if (isLVar(t2)) {
      return bindings.extend(t2, t1);
    }
    if (pair(t1) && pair(t2)) {
      bindings = unify(car(t1), ca(t2), bindings);
      bindings = bindings !== null ? unify(cdr(t1), cdr(t2), bindings) : bindings;
      return bindings;
    }
    return null;
  };
  var goal = F.goal = function(l, r) {
    return function(bindings) {
      var result = unify(l, r, bindings);
      return (result !== null) ? succeed(result) : fail(bindings);
    };
  };
  var run = F.run = function(goal) {
    return goal(F.ignorance);
  };
  var choice = F.choice = function($v, list) {
    return (isEmpty(list)) ? fail : disj(goal($v, car(list)), choice($v, cdr(list)));
  };
  F.commono = function(l, r, n) {
    var $x = F.lvar(n);
    return F.conj(F.choice($x, l), F.choice($x, r));
  };
  F.conso = function($a, $b, list) {
    return F.goal(cons($a, $b), list);
  };
  F.joino = function($a, $b, list) {
    return F.goal([$a, $b], list);
  };

  F.installTo = function(obj) {
    var prop;
    obj = obj || this;
    for (prop in F) {
      if (F.hasOwnProperty(prop)) {
        obj[prop] = F[prop];
      }
    }
    return F;
  };

  if (typeof module !== "undefined" && module !== null) {
    return module.exports = F;
  } else {
    return root.F = F;
  }
})(this);
