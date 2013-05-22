
F.installTo(this);

describe("mhkanren", function() {
   
    describe("non-deterministic functions", function() {
        function f1(x) { return succeed(x + " f1"); }
        function f2(x) { return succeed(x + " f2"); }
        describe("disj", function() {
            it("returns all the results of f1 and all the results of f2", function() {
                var rv = disj(f1, f2)("test1");
                expect(pair(rv)).toBe(true);
                expect(car(rv)).toBe("test1 f1");
                expect(car(cdr(rv))).toBe("test1 f2");
                expect(rv.toString()).toEqual("(test1 f1 test1 f2)");
            });
            
            it("returns no results only if neither f1 nor f2 returned any results", function() {
                var rv = disj(fail, fail)("test2");
                expect(isEmpty(rv)).toBe(true);
                rv = disj(fail, succeed)("test2");
                expect(car(rv)).toEqual("test2");
                expect(cdr(rv)).toBe(null);
                rv = disj(succeed, fail)("test2");
                expect(car(rv)).toEqual("test2");
                expect(cdr(rv)).toBe(null);
            });
        });
        
        describe("conj", function() {
            it("returns the result of f2 applied to output of f1(x)", function() {
                var rv = conj(f1, f2)("test3");
                expect(car(rv)).toEqual("test3 f1 f2");
                expect(cdr(rv)).toBe(null);
            });
            
            it("returns no results if any of its arguments fails", function() {
                var sf = conj(succeed, fail)("test4");
                var fs = conj(fail, succeed)("test4");
                expect(isEmpty(sf)).toBe(true);
                expect(isEmpty(fs)).toBe(true);
            });
        });
    });
    
    describe("Goals", function() {

        describe("fail", function() {
            it("returns an empty list for any arguments", function() {
                expect(isEmpty(fail(5))).toBe(true);
            });
        });

        describe("succeed", function() {
            it("returns a list containing its (first) argument", function() {
                expect(car(succeed(5))).toEqual(5);
                expect(succeed(5).toString()).toEqual("(5)");
            });
        });
        
        describe("unify", function() {
            it("returns the substitution object on success", function() {
                var q = lvar("q");
                var b = unify(true, q, ignorance);
                expect(b.binds).toEqual({q: true});
            });
            
            it("can bind lvar to another lvar", function() {
                var q = lvar("q");
                var p = lvar("p");
                var b = unify(p, q, ignorance);
                expect(b.binds.p).toEqual(q);
            });
            
            it("can bind an lvar to a value", function() {
                var q = lvar("q");
                var p = lvar("p");
                var b = unify(p, q, ignorance);
                var b = unify(q, 1, b);
                expect(b.binds.q).toEqual(1);
            });
            
            it("can be composed with itself", function() {
                var q = lvar("q");
                var p = lvar("p");
                var b = unify(p, 1, unify(p, q, ignorance));
                expect(b.lookup(q)).toBe(1); 
            });
        });
        
        describe("goal method", function() {
            it("takes two arguments", function() {
                expect(goal.length).toBe(2);
            });
            it("returns a function", function() {
                var g = goal(1,2);
                expect(typeof g).toBe("function");                
            });
            describe("the function returned from F.goal", function() {
                it("returns a list of bindings (substitutions)", function() {
                    var q = lvar("q");
                    var g = goal(q, true);
                    var r = g(ignorance);
                    expect(pair(r)).toBe(true);
                    expect(car(r).binds).toEqual({q: true});
                });
            });
            
        });
        
        describe("choice", function() {
            it("succeeds (non-empty substitutions) if the element is a member of the list", function() {
                var c = run(choice(2, list(1,2,3)));
                expect(car(c).binds).toEqual({});
            });
        
            it("fails (empty substitutions) if the element is not a member of the list", function() {
                var c = run(choice(10, list(1,2,3)));
                expect(isEmpty(c)).toBe(true);
            });
            
            it("returns a list of bindings that an lvar can take in the list", function() {
                var q = lvar("q");
                var c = run(choice(q, list(1,2,3)));
                expect(length(c)).toEqual(3);
                expect(car(c).binds).toEqual({q: 1});
                expect(car(cdr(c)).binds).toEqual({q: 2});
                expect(car(cdr(cdr(c))).binds).toEqual({q: 3});
            });
        });
        
        describe("commono", function() {
            it("returns an lvar bound to the common element of two lists", function() {
                var c = run(commono(list(1,2,3), list(3,4,5), "_.x"));
                expect(car(c).binds).toEqual({x: 3});
            });
            
            it("returns bindings of an lvar to multiple common elements of two lists", function() {
                var c = run(commono(list(1,2,3), list(3,4,1,7)));
                expect(length(c)).toBe(2);
                expect(car(c).binds).toEqual({x: 1});
                expect(car(cdr(c)).binds).toEqual({x: 3});
            });
            
            it("returns an empty list if there are no common elements", function() {
                var c = run(commono(list(11,2,3), list(13, 4, 1, 7)));
                expect(isEmpty(c)).toBe(true);
            });
            
        });
        
        describe("conso", function() {
            it("conso(a, b, l) succeeds if in the current state of the world, cons(a, b) is the same as l.", function() {
                var c = run(conso(1, [2, 3], [1,2,3]));
                expect(c[0].binds).toEqual({});
            });
            
            it("may bind lvar to the list", function() {
                var q = lvar("q");
                var c = run(F.conso(1, [2, 3], q));
                expect(c[0].binds).toEqual({q: [1,2,3]});
            });

            it("may bind lvar to a or b", function() {
                var q = lvar("q");
                var p = lvar("p");
                var c = run(F.conso(q, p, [1,2,3]));
                expect(c[0].binds).toEqual({q: 1, p: [2,3]});
            });
        });

        describe("joino", function() {
            it("succeeds if l3 is the same as the concatenation of l1 and l2", function() {
                var c = run(F.joino([1], [2], F.lvar("q")));
                expect(c[0].binds).toEqual({q: [1,2]});

                c = F.run(joino([1, 2, 3], lvar("q"), [1,2,3,4,5]));
                expect(c[0].binds).toEqual({q: [4,5]});
// FAILING TESTS
                c = F.run(F.joino(F.lvar("q"), [4,5], [1,2,3,4,5]));
                expect(c[0].binds).toEqual({q: [1,2,3]});

                c = F.run(F.joino(F.lvar("q"), F.lvar("p"), [1,2,3,4,5]));
                expect(c[0].binds).toEqual({q: []});
            });

            it("fails if it cannot unify l1 & l2 with l3", function() {
                var c = F.run(F.joino([1], [2], [1]));
                expect(c).toEqual([]);
            });

        });

    });
/*
    describe("Logic Engine", function() {
        describe("run", function() {
            it("returns an empty list if its goal fails", function() {
                var q = F.lvar("q");
                var p = F.lvar("p");
                expect(F.run(F.fail)).toEqual([]);
                expect(F.run(F.goal(1, false))).toEqual([]);
                expect(F.run(F.goal(1, null))).toEqual([]);
                expect(F.run(F.goal(false, 1))).toEqual([]);
                expect(F.run(F.goal(null, 1))).toEqual([]);
                expect(F.run(F.goal(2, 1))).toEqual([]);
            });
            
            it("returns a non-empty list if its goal succeeds", function() {
                var q = F.lvar("q");
                var b = F.run(F.succeed);
                expect(b instanceof Array).toBe(true);
                expect(b[0].binds).toEqual({});
                b = F.run(F.goal(q, true));
                expect(b instanceof Array).toBe(true);
                expect(b[0].binds).toEqual({q: true});
            });

        });
    });
/**/
});




