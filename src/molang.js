// A lightweight Molang -> JavaScript transpiler for the celestial subset
export const molangMath = {
    sin: (d) => Math.sin(d * Math.PI / 180),
    cos: (d) => Math.cos(d * Math.PI / 180),
    clamp: (v, min, max) => Math.min(Math.max(v, min), max)
};

export function compileMolang(expr) {
    if (typeof expr === 'number') return () => expr;
    
    // Convert Bedrock string syntax to JS
    let cleanExpr = expr.toString()
        // Replace 'this' keyword with 'this_val' variable
        .replace(/\bthis\b/gi, 'this_val')
        // Convert query.position(x) to query.position_x
        .replace(/query\.position\((.*?)\)/g, 'query.position_$1')
        // Convert query.is_item_name_any to a method call
        .replace(/query\.is_item_name_any/g, 'query.is_item_name_any');

    try {
        // Return an executable function scoped with our mock environment
        return new Function('math', 'query', 'this_val', `return ${cleanExpr};`);
    } catch (e) {
        console.error("Molang Compilation Error:", expr, e);
        return () => 0;
    }
}