import * as util from '../src/util'

describe('in the util', function () {

  describe('the bytesum should', function () {

    test('add all bytes of a buffer to one byte', async function () {
      const buffer = Buffer.from('Hello World!')
      const bytesum = util.bytesum(buffer)
      expect(bytesum).toBeGreaterThanOrEqual(0x00)
      expect(bytesum).toBeLessThanOrEqual(0xff)
    })

  })

})

