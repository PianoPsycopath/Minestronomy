const DAY_OF_YEAR = "math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365)";
const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const ATLAS_ROW = 0.083333;

// Builds a nested conditional: the first month whose end day is above the day of year wins.
function monthLadder(leaf, last) {
  let expr = last;
  for (let i = MONTH_STARTS.length - 2; i >= 0; i--) {
    expr = `(${DAY_OF_YEAR} < ${MONTH_STARTS[i + 1]} ? ${leaf(i)} : ${expr})`;
  }
  return expr;
}

function dayOfMonthExpression() {
  const last = MONTH_STARTS.length - 1;
  return monthLadder(i => `(${DAY_OF_YEAR} - ${MONTH_STARTS[i]} + 1)`, `(${DAY_OF_YEAR} - ${MONTH_STARTS[last]} + 1)`);
}

function monthRowExpression() {
  return `(${monthLadder(i => String(i), String(MONTH_STARTS.length - 1))}) * ${ATLAS_ROW}`;
}

export function buildCalendarRenderControllersJson() {
  const dayFormula = dayOfMonthExpression();

  return {
    format_version: "1.10.0",
    render_controllers: {
      "controller.render.calendar.day_tens": {
        geometry: "Geometry.calendar_day_tens",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, `math.floor(math.floor(${dayFormula}) / 10) * 0.083333`],
          scale: [1, 1]
        }
      },
      "controller.render.calendar.day_ones": {
        geometry: "Geometry.calendar_day_ones",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, `math.mod(math.floor(${dayFormula}), 10) * 0.083333`],
          scale: [1, 1]
        }
      },
      "controller.render.calendar.month": {
        geometry: "Geometry.calendar_month",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [
            0.53846,
            monthRowExpression()
          ],
          scale: [1, 1]
        }
      },
      "controller.render.calendar.weekday": {
        geometry: "Geometry.calendar_weekday",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0.076923, "math.floor(math.mod((query.time_of_day < 0.75 ? query.day : query.day + 1), 7)) * 0.083333"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.minute_tens": {
        geometry: "Geometry.clock_minute_tens",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, "math.mod((math.mod(math.floor(query.time_of_day * 24) + 11, 12)) + 1, 10) * 0.083333"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.minute_ones": {
        geometry: "Geometry.clock_minute_ones",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, "math.floor(((math.mod(math.floor(query.time_of_day * 24) + 11, 12)) + 1) / 10) * 0.083333"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.hour_tens": {
        geometry: "Geometry.clock_hour_tens",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, "math.mod(math.mod(math.floor(query.time_of_day * 288), 12) * 5, 10) * 0.083333"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.hour_ones": {
        geometry: "Geometry.clock_hour_ones",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, "math.floor(math.mod(math.floor(query.time_of_day * 288), 12) * 5 / 10) * 0.083333"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.ampm": {
        geometry: "Geometry.clock_ampm",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0.076923, "(math.floor(query.time_of_day * 2) == 0 ? 0.833333 : 0.916667)"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.colon": {
        geometry: "Geometry.clock_colon",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: { offset: [0, 0.916667], scale: [1, 1] }
      },
      "controller.render.calendar.year_thousands": {
        geometry: "Geometry.calendar_year_thousands",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: { offset: [0, "math.floor(math.mod(query.day / 365 / 1000, 10)) * 0.083333"], scale: [1, 1] }
      },
      "controller.render.calendar.year_hundreds": {
        geometry: "Geometry.calendar_year_hundreds",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: { offset: [0, "math.floor(math.mod(query.day / 365 / 100, 10)) * 0.083333"], scale: [1, 1] }
      },
      "controller.render.calendar.year_tens": {
        geometry: "Geometry.calendar_year_tens",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: { offset: [0, "math.floor(math.mod(query.day / 365 / 10, 10)) * 0.083333"], scale: [1, 1] }
      },
      "controller.render.calendar.year_ones": {
        geometry: "Geometry.calendar_year_ones",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: { offset: [0, "math.floor(math.mod(query.day / 365, 10)) * 0.083333"], scale: [1, 1] }
      }
    }
  };
}
