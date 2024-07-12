import * as u from '@jsmanifest/utils'

export function createMark(
  name: string,
  detailOrStartTimeOrOptions?:
    | string
    | number
    | Record<string, any>
    | PerformanceMarkOptions,
) {
  const options = {} as PerformanceMarkOptions

  if (
    u.isStr(detailOrStartTimeOrOptions) ||
    u.isObj(detailOrStartTimeOrOptions)
  ) {
    options.detail = detailOrStartTimeOrOptions
  } else if (u.isNum(detailOrStartTimeOrOptions)) {
    options.startTime = detailOrStartTimeOrOptions
  }

  return performance.mark(name, options)
}

export function createMeasure(
  options: PerformanceMeasureOptions,
): PerformanceMeasure

export function createMeasure(
  name: string,
  startTime: string,
  endTime?: string,
): PerformanceMeasure

export function createMeasure(
  name: string,
  options?: PerformanceMeasureOptions,
): PerformanceMeasure

export function createMeasure(...args: any[]) {
  let name = ''
  let start: string | undefined
  let end: string | undefined
  let duration: number | undefined
  let detail: any

  if (args.length === 1) {
    if (u.isObj(args[0])) {
      const opts = args[0]
      name = opts.name
      start = opts.start
      end = opts.end
      duration = opts.duration
      detail = opts.detail
    } else if (u.isStr(args[0])) {
      name = args[0]
    }
  } else if (args.length === 2) {
    name = args[0]
    if (u.isObj(args[1])) {
      start = args[1].start
      end = args[1].end
      duration = args[1].duration
      detail = args[1].detaiil
    } else if (u.isStr(args[1])) {
      start = args[1]
    }
  } else if (args.length === 3) {
    name = args[0]
    start = args[1]
    end = args[2]
  }

  return performance.measure(name, { start, end, duration, detail })
}
