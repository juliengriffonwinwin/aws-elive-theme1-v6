const gulp = require('gulp')
const awspublish = require('gulp-awspublish')
const cloudfront = require('gulp-cloudfront-invalidate-aws-publish')
const parallelize = require('concurrent-transform')

// https://docs.aws.amazon.com/cli/latest/userguide/cli-environment.html

const config = {
  // Required
  params: {
    Bucket: process.env.AWS_BUCKET_NAME
  },
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signatureVersion: 'v3'
  },

  // Optional
  deleteOldVersions: false, // NOT FOR PRODUCTION
  distribution: process.env.AWS_CLOUDFRONT, // CloudFront distribution ID
  region: process.env.AWS_DEFAULT_REGION,
  headers: {
    /* 'Cache-Control': 'max-age=315360000, no-transform, public' */
  },

  // Sensible Defaults - gitignore these Files and Dirs
  distDir: 'dist',
  indexRootPath: true,
  cacheFileName: '.awspublish',
  concurrentUploads: 10,
  wait: true // wait for CloudFront invalidation to complete (about 30-60 seconds)
}

gulp.task('deploy', function () {
  // create a new publisher using S3 options
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
  const publisher = awspublish.create(config)
  // console.log(publisher)

  let g = gulp.src('./' + config.distDir + '/**')
  //console.log(g)

  // publisher will add Content-Length, Content-Type and headers specified above
  // If not specified it will set x-amz-acl to public-read by default
  g = g.pipe(
    parallelize(publisher.publish(config.headers), config.concurrentUploads)
  )
  //console.log('---------------')
  //console.log(g)

  
  // Invalidate CDN
  try {
    console.log(1)
    if (config.distribution) {
      console.log(2)
      console.log('Configured with CloudFront distribution')
      g = g.pipe(cloudfront(config))
      console.log(3)
    } else {
      console.log(4)
      console.log(
        'No CloudFront distribution configured - skipping CDN invalidation'
      )
    }
  } catch(e) {
    console.log('ERROR')
    console.log(e)
  }

  console.log(5)


  // Delete removed files
  if (config.deleteOldVersions) {
    console.log(6)
    try {
      g = g.pipe(publisher.sync())
    } catch(e) {
      console.log('ERROR')
      console.log(e)
    }
  }
  console.log(7)
  // create a cache file to speed up consecutive uploads
  g = g.pipe(publisher.cache())
  console.log(8)
  // print upload updates to console
  g = g.pipe(awspublish.reporter())
  console.log(9)
  return g

})
