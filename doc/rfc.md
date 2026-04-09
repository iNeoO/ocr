# ocr

## endpoints

### auth

- Post /login
- Post /sign-in
- Post /sign-out
- Post /forgot-password
- Post /validate-email
- Post /resend-validation

### user

- Get /me
- Patch /me

### application

- Post /file
- Delete /file
- Get /status
- Get /file/:fileid

## queues

- split file to pages "split.to.pages"
- analyze page "convert.page"

## flow

1. Post /file
2. Upload on s3 (fileService.uploadFile)
3. create process (process.createProcess)
4. Create event in que for "split.to.pages"
5. worker call (process.updateProcess), (fileservice.splitpdf)
6. Split pages to png page, upload on s3, create event for "convert.page"
7. On ever "convert.page" finished, update status of file
8. when over propose a download of all pages ziped

## admin

Admin page to display some metrics about queue
