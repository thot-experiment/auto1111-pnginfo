//get int32 from png compensating for endianness
const i32 = (a,i) => new Uint32Array(new Uint8Array([...a.slice(i,i+4)].reverse()).buffer)[0]

const infoparser = line => {
  let output = {}
  let buffer = ''
  let key
  let quotes = false
  //actually no idea why there are trailing : sometimes?
  if (line.at(-1) === ':') line = line.slice(0, -1)
  ;[...line].forEach(c => {
    if (c === '"') { quotes = !quotes }
    if (c === ':' && !quotes) { key = buffer,buffer='' }
    else if (c === ',' && !quotes) {output[key.trim()] = buffer.slice(1),buffer=''}
    else {buffer += c}
  })
  output[key.trim()] = buffer.slice(1)
  return output
}

const PNGINFO = (png, cast_to_snake=true) => {
  let bin_str, bytes
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(png)) {
    bytes = Uint8Array.from(png)
    bin_str = png.toString()
  } else if (png instanceof Uint8Array) {
    bytes = png
    bin_str = png.toString()
  } else {
    bin_str = atob(png.slice(0,8192))
    bytes = Uint8Array.from(bin_str, c => c.charCodeAt(0)) 
  }
  const pngmagic = bytes.slice(0,8) == '137,80,78,71,13,10,26,10'
  if (!pngmagic) return
  let [ihdrSize,width,height] = [i32(bytes,8),i32(bytes,16),i32(bytes,20)]
  let txtOffset = 8+ihdrSize+12
  let txtSize = i32(bytes,txtOffset)
  let raw_info = bin_str.slice(txtOffset+8+"parameters\u0000".length,txtOffset+8+txtSize)
  let infolines = raw_info.split('\n')
  let negative_prompt_index = infolines.findIndex(a => a.match(/^Negative prompt:/))
  let prompt = infolines.splice(0,negative_prompt_index).join('\n').trim()
  let steps_index = infolines.findIndex(a => a.match(/^Steps:/))
  let negative_prompt = infolines.splice(0,steps_index).join('\n').slice('Negative prompt:'.length).trim()
  let infoline = infolines.splice(0,1)[0]
  let data = infoparser(infoline)

  data = Object.fromEntries(
    Object.entries(data).map(([key,value])=>{
      let asNum = parseFloat(value)
      let isNotNum = value-asNum
      if (cast_to_snake) key = key.toLowerCase().replaceAll(' ','_') 
      let out = [key, isNotNum || isNaN(isNotNum)?value:asNum]
      return out
    })
  )

  let output = {width,height,prompt,negative_prompt,extra:infolines,raw_info}
  return Object.assign(output,data)
}

export default PNGINFO
