/** Returns whether `url` starts with a scheme and `//`, such as `https://`. */
export const isAbsoluteUrl = (url: string): boolean => /^[a-z][a-z\d+.-]*:\/\//i.test(url)
