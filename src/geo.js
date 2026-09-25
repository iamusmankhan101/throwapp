// Rough equirectangular world mask: 64 cols (5.625° each, from 180°W),
// rows are 5° each starting at 80°N. Only needs to read as "a world map".
const MASK = [
  '                 #######       ##                               ',
  '        ####   ##########      #      ######  #####             ',
  '   ######################     ##   ######################  ###  ',
  '  ########################    #   ########################### # ',
  '    ####################          ############################  ',
  '       ################        # #############################  ',
  '         ##############       ##############################    ',
  '         ##############      ############################# #    ',
  '          ############      ##### #####################  ##     ',
  '           #########        ##  ######################  #       ',
  '            ######         ####  ####################           ',
  '             #####        ##########  ##############            ',
  '              ####        ###########   ##  ########            ',
  '                ###       ############   #   #####  #           ',
  '                  ##       ##########        ###  #  ##          ',
  '                   ####      #######          #   ####          ',
  '                   ######     #####               #######       ',
  '                   ########   ######              ### ####      ',
  '                    #######   #####                    #####    ',
  '                    ######    ####                  ########    ',
  '                     #####    ####                 #########    ',
  '                      ###      ##                  #########    ',
  '                      ###      #                    ##   ##     ',
  '                      ##                                   #  # ',
  '                      #                                      #  ',
  '                      #                                         ',
]

export const MAP_COLS = 64
export const MAP_ROWS = MASK.length
export const CELL = 10

export const MAP_DOTS = MASK.flatMap((row, r) =>
  [...row].flatMap((ch, c) => (ch === '#' ? [{ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 }] : [])),
)

export function project(lat, lon) {
  return {
    x: ((lon + 180) / 5.625) * CELL,
    y: ((80 - lat) / 5) * CELL + CELL / 2,
  }
}

export function milesBetween(a, b) {
  const R = 3958.8
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const HOME = { name: 'You', city: 'Dubai', lat: 25.2, lon: 55.3 }

export const PEOPLE = [
  { name: 'Maya', city: 'London', lat: 51.5, lon: -0.1, color: '#7986cb', note: 'Saw your favorite band’s poster today. Thought of you.' },
  { name: 'Leo', city: 'New York', lat: 40.7, lon: -74, color: '#ff8a65', note: 'Happy birthday, big brother. Call me when you land?' },
  { name: 'Aiko', city: 'Tokyo', lat: 35.7, lon: 139.7, color: '#f06292', note: 'Counting down the days until spring. Miss you!' },
  { name: 'Sam', city: 'Sydney', lat: -33.9, lon: 151.2, color: '#4db6ac', note: 'Your plant is thriving. I promise I’m watering it.' },
  { name: 'Nour', city: 'Cairo', lat: 30, lon: 31.2, color: '#ffb74d', note: 'Tea on the balcony isn’t the same without you.' },
]
