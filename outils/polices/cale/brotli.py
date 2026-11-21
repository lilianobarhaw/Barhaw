# petite cale « brotli » pour fontTools (le module Python manque ici) : la compression passe par zlib de Node
import subprocess
MODE_GENERIC, MODE_TEXT, MODE_FONT = 0, 1, 2
_JS = r"""
const z = require('zlib'); const morceaux = [];
process.stdin.on('data', (d) => morceaux.push(d)).on('end', () => {
  const b = Buffer.concat(morceaux);
  const r = process.argv[1] === 'c'
    ? z.brotliCompressSync(b, { params: { [z.constants.BROTLI_PARAM_MODE]: +process.argv[2], [z.constants.BROTLI_PARAM_QUALITY]: +process.argv[3], [z.constants.BROTLI_PARAM_LGWIN]: +process.argv[4], [z.constants.BROTLI_PARAM_SIZE_HINT]: b.length } })
    : z.brotliDecompressSync(b);
  process.stdout.write(r);
});
"""
def compress(data, mode=MODE_GENERIC, quality=11, lgwin=22, lgblock=0):
    return subprocess.run(["node", "-e", _JS, "c", str(mode), str(quality), str(lgwin)], input=bytes(data), capture_output=True, check=True).stdout
def decompress(data):
    return subprocess.run(["node", "-e", _JS, "d"], input=bytes(data), capture_output=True, check=True).stdout
class error(Exception):
    pass
